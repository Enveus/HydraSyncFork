/**
 * Utility functions for Sync ID-based role management
 */

import { getGuildRoles, addRoleToMember, removeRoleFromMember, debugLog } from './index.js';

/**
 * Gets all roles with a specific Sync ID from all synced servers
 * @param {string} userId - Discord user ID
 * @param {number} syncId - Sync ID to find
 * @param {Array} syncedServers - Array of synced server IDs
 * @param {Object} client - Discord client
 * @param {Object} cache - Role cache object
 * @param {boolean} isDebug - Whether debug mode is enabled
 * @returns {Promise<Array>} Array of roles with the specified Sync ID
 */
export const getRolesWithSyncId = async (userId, syncId, syncedServers, client, cache, isDebug) => {
    const rolesWithSyncId = [];
    
    for (const serverId of syncedServers) {
        try {
            const server = await client.guilds.fetch(serverId);
            
            try {
                const member = await server.members.fetch(userId);
                
                if (member) {
                    // Get all roles for the server
                    const serverRoles = await getGuildRoles(server, cache, isDebug);
                    
                    // Get the configuration for this server's roles
                    const serverConfig = client.syncConfig?.syncedServers?.find(s => s.id === serverId);
                    
                    if (serverConfig && serverConfig.roles) {
                        // Get all roles that the member has
                        const memberRoles = member.roles.cache;
                        
                        // Find roles with the specified Sync ID that the member has
                        for (const memberRole of memberRoles.values()) {
                            if (memberRole.name === '@everyone') continue;
                            
                            const roleConfig = serverConfig.roles.find(r => r.id === memberRole.id);
                            
                            // Check if the role has the specified Sync ID either as syncId or in syncIds array
                            if (roleConfig && (
                                roleConfig.syncId === syncId || 
                                (roleConfig.syncIds && roleConfig.syncIds.includes(syncId))
                            )) {
                                rolesWithSyncId.push({
                                    serverId,
                                    serverName: server.name,
                                    role: memberRole
                                });
                            }
                        }
                    }
                }
            } catch (memberError) {
                debugLog(`User ${userId} not found in server ${server.name}`, isDebug);
                // This is an expected case, not an error
            }
        } catch (serverError) {
            console.error(`Error processing server ${serverId}:`, serverError);
        }
    }
    
    return rolesWithSyncId;
};

/**
 * Checks if a user has any roles with a specific Sync ID in any synced server
 * @param {string} userId - Discord user ID
 * @param {number} syncId - Sync ID to check
 * @param {Array} syncedServers - Array of synced server IDs
 * @param {Object} client - Discord client
 * @param {Object} cache - Role cache object
 * @param {boolean} isDebug - Whether debug mode is enabled
 * @returns {Promise<boolean>} Whether the user has any roles with the specified Sync ID
 */
export const hasRoleWithSyncId = async (userId, syncId, syncedServers, client, cache, isDebug) => {
    const roles = await getRolesWithSyncId(userId, syncId, syncedServers, client, cache, isDebug);
    return roles.length > 0;
};

/**
 * Gets the role with a specific Sync ID from the main server
 * @param {number} syncId - Sync ID to find
 * @param {string} mainServerId - Main server ID
 * @param {Object} client - Discord client
 * @param {Object} cache - Role cache object
 * @param {boolean} isDebug - Whether debug mode is enabled
 * @returns {Promise<Object|null>} Role object or null if not found
 */
export const getMainServerRoleWithSyncId = async (syncId, mainServerId, client, cache, isDebug) => {
    try {
        const mainServer = await client.guilds.fetch(mainServerId);
        const mainServerRoles = await getGuildRoles(mainServer, cache, isDebug);
        
        // Get the configuration for the main server's roles
        const mainServerConfig = client.syncConfig?.mainServer;
        
        if (mainServerConfig && mainServerConfig.roles) {
            // Find the role with the specified Sync ID
            const roleConfig = mainServerConfig.roles.find(r => r.syncId === syncId);
            
            if (roleConfig) {
                return mainServerRoles.find(r => r.id === roleConfig.id);
            }
        }
    } catch (error) {
        console.error(`Error getting main server role with Sync ID ${syncId}:`, error);
    }
    
    return null;
};

/**
 * Gets all roles with a specific Sync ID from a specific server
 * @param {number} syncId - Sync ID to find
 * @param {string} serverId - Server ID
 * @param {Object} client - Discord client
 * @param {Object} cache - Role cache object
 * @param {boolean} isDebug - Whether debug mode is enabled
 * @returns {Promise<Array>} Array of roles with the specified Sync ID
 */
export const getServerRolesWithSyncId = async (syncId, serverId, client, cache, isDebug) => {
    try {
        const server = await client.guilds.fetch(serverId);
        const serverRoles = await getGuildRoles(server, cache, isDebug);
        
        // Get the configuration for this server's roles
        const serverConfig = serverId === client.syncConfig?.mainServer?.id
            ? client.syncConfig?.mainServer
            : client.syncConfig?.syncedServers?.find(s => s.id === serverId);
        
        if (serverConfig && serverConfig.roles) {
            // Find all roles with the specified Sync ID (either as syncId or in syncIds array)
            const roleConfigs = serverConfig.roles.filter(r => 
                r.syncId === syncId || 
                (r.syncIds && r.syncIds.includes(syncId))
            );
            
            if (roleConfigs.length > 0) {
                return serverRoles.filter(r => roleConfigs.some(rc => rc.id === r.id));
            }
        }
    } catch (error) {
        console.error(`Error getting server roles with Sync ID ${syncId}:`, error);
    }
    
    return [];
};

/**
 * Adds a role with a specific Sync ID to a member in the main server
 * @param {Object} member - Discord member object
 * @param {number} syncId - Sync ID to add
 * @param {Object} client - Discord client
 * @param {Object} state - Bot state
 * @returns {Promise<Object>} Result of the operation
 */
export const addRoleWithSyncIdToMainServer = async (member, syncId, client, state) => {
    try {
        const mainServerId = client.syncConfig?.mainServer?.id;
        
        if (!mainServerId) {
            return { success: false, message: 'Main server not configured' };
        }
        
        const mainServer = await client.guilds.fetch(mainServerId);
        let mainServerMember;
        
        try {
            mainServerMember = await mainServer.members.fetch(member.id);
        } catch (err) {
            return { success: false, message: `User not found in main server` };
        }
        
        const roleToAdd = await getMainServerRoleWithSyncId(syncId, mainServerId, client, state.cache, state.isDebug);
        
        if (roleToAdd) {
            await addRoleToMember(mainServerMember, roleToAdd);
            
            return { 
                success: true, 
                message: `Added ${roleToAdd.name} to ${mainServerMember.user.username} in ${mainServer.name}` 
            };
        } else {
            return { 
                success: false, 
                message: `No role with Sync ID ${syncId} found in main server` 
            };
        }
    } catch (err) {
        console.error(err);
        return { success: false, message: 'There was an error while adding the role.' };
    }
};

/**
 * Removes a role with a specific Sync ID from a member in the main server
 * @param {Object} member - Discord member object
 * @param {number} syncId - Sync ID to remove
 * @param {Object} client - Discord client
 * @param {Object} state - Bot state
 * @returns {Promise<Object>} Result of the operation
 */
export const removeRoleWithSyncIdFromMainServer = async (member, syncId, client, state) => {
    try {
        const mainServerId = client.syncConfig?.mainServer?.id;
        
        if (!mainServerId) {
            return { success: false, message: 'Main server not configured' };
        }
        
        const mainServer = await client.guilds.fetch(mainServerId);
        let mainServerMember;
        
        try {
            mainServerMember = await mainServer.members.fetch(member.id);
        } catch (err) {
            return { success: false, message: `User not found in main server` };
        }
        
        const roleToRemove = await getMainServerRoleWithSyncId(syncId, mainServerId, client, state.cache, state.isDebug);
        
        if (roleToRemove) {
            await removeRoleFromMember(mainServerMember, roleToRemove);
            
            return { 
                success: true, 
                message: `Removed ${roleToRemove.name} from ${mainServerMember.user.username} in ${mainServer.name}` 
            };
        } else {
            return { 
                success: false, 
                message: `No role with Sync ID ${syncId} found in main server` 
            };
        }
    } catch (err) {
        console.error(err);
        return { success: false, message: 'There was an error while removing the role.' };
    }
};

/**
 * Adds roles with a specific Sync ID to a member in all synced servers
 * @param {Object} member - Discord member object from main server
 * @param {number} syncId - Sync ID to add
 * @param {Object} client - Discord client
 * @param {Object} state - Bot state
 * @returns {Promise<Object>} Result of the operation
 */
export const addRoleWithSyncIdToSyncedServers = async (member, syncId, client, state) => {
    try {
        const syncedServerIds = client.syncConfig?.syncedServers?.map(s => s.id) || [];
        
        if (syncedServerIds.length === 0) {
            return { success: false, message: 'No synced servers configured' };
        }
        
        const results = [];
        
        for (const serverId of syncedServerIds) {
            try {
                const server = await client.guilds.fetch(serverId);
                
                try {
                    const serverMember = await server.members.fetch(member.id);
                    
                    if (serverMember) {
                        const rolesToAdd = await getServerRolesWithSyncId(syncId, serverId, client, state.cache, state.isDebug);
                        
                        for (const role of rolesToAdd) {
                            try {
                                await addRoleToMember(serverMember, role);
                                results.push({
                                    success: true,
                                    message: `Added ${role.name} to ${serverMember.user.username} in ${server.name}`
                                });
                            } catch (roleError) {
                                results.push({
                                    success: false,
                                    message: `Failed to add ${role.name} to ${serverMember.user.username} in ${server.name}: ${roleError.message}`
                                });
                            }
                        }
                    }
                } catch (memberError) {
                    debugLog(`User ${member.id} not found in server ${server.name}`, state.isDebug);
                    // This is an expected case, not an error
                }
            } catch (serverError) {
                console.error(`Error processing server ${serverId}:`, serverError);
                results.push({
                    success: false,
                    message: `Error processing server ${serverId}: ${serverError.message}`
                });
            }
        }
        
        return {
            success: results.some(r => r.success),
            message: results.map(r => r.message).join('\n')
        };
    } catch (err) {
        console.error(err);
        return { success: false, message: 'There was an error while adding the roles.' };
    }
};

/**
 * Removes roles with a specific Sync ID from a member in all synced servers
 * @param {Object} member - Discord member object from main server
 * @param {number} syncId - Sync ID to remove
 * @param {Object} client - Discord client
 * @param {Object} state - Bot state
 * @returns {Promise<Object>} Result of the operation
 */
export const removeRoleWithSyncIdFromSyncedServers = async (member, syncId, client, state) => {
    try {
        const syncedServerIds = client.syncConfig?.syncedServers?.map(s => s.id) || [];
        
        if (syncedServerIds.length === 0) {
            return { success: false, message: 'No synced servers configured' };
        }
        
        const results = [];
        
        for (const serverId of syncedServerIds) {
            try {
                const server = await client.guilds.fetch(serverId);
                
                try {
                    const serverMember = await server.members.fetch(member.id);
                    
                    if (serverMember) {
                        const rolesToRemove = await getServerRolesWithSyncId(syncId, serverId, client, state.cache, state.isDebug);
                        
                        for (const role of rolesToRemove) {
                            try {
                                await removeRoleFromMember(serverMember, role);
                                results.push({
                                    success: true,
                                    message: `Removed ${role.name} from ${serverMember.user.username} in ${server.name}`
                                });
                            } catch (roleError) {
                                results.push({
                                    success: false,
                                    message: `Failed to remove ${role.name} from ${serverMember.user.username} in ${server.name}: ${roleError.message}`
                                });
                            }
                        }
                    }
                } catch (memberError) {
                    debugLog(`User ${member.id} not found in server ${server.name}`, state.isDebug);
                    // This is an expected case, not an error
                }
            } catch (serverError) {
                console.error(`Error processing server ${serverId}:`, serverError);
                results.push({
                    success: false,
                    message: `Error processing server ${serverId}: ${serverError.message}`
                });
            }
        }
        
        return {
            success: results.some(r => r.success),
            message: results.map(r => r.message).join('\n')
        };
    } catch (err) {
        console.error(err);
        return { success: false, message: 'There was an error while removing the roles.' };
    }
};

/**
 * Gets the Sync ID for a role
 * @param {Object} role - Discord role object
 * @param {string} serverId - Server ID
 * @param {Object} client - Discord client
 * @returns {number|null} Sync ID or null if not found
 */
export const getSyncIdForRole = (role, serverId, client) => {
    // Get the configuration for this server's roles
    const serverConfig = serverId === client.syncConfig?.mainServer?.id
        ? client.syncConfig?.mainServer
        : client.syncConfig?.syncedServers?.find(s => s.id === serverId);
    
    if (serverConfig && serverConfig.roles) {
        // Find the role configuration
        const roleConfig = serverConfig.roles.find(r => r.id === role.id);
        
        if (roleConfig) {
            return roleConfig.syncId;
        }
    }
    
    return null;
};

/**
 * Gets all Sync IDs for a role
 * @param {Object} role - Discord role object
 * @param {string} serverId - Server ID
 * @param {Object} client - Discord client
 * @returns {Array<number>|null} Array of Sync IDs or null if not found
 */
export const getSyncIdsForRole = (role, serverId, client) => {
    // Get the configuration for this server's roles
    const serverConfig = serverId === client.syncConfig?.mainServer?.id
        ? client.syncConfig?.mainServer
        : client.syncConfig?.syncedServers?.find(s => s.id === serverId);
    
    if (serverConfig && serverConfig.roles) {
        // Find the role configuration
        const roleConfig = serverConfig.roles.find(r => r.id === role.id);
        
        if (roleConfig) {
            // If syncIds array exists, return it
            if (roleConfig.syncIds && roleConfig.syncIds.length > 0) {
                return roleConfig.syncIds;
            }
            // Otherwise, return an array with just syncId if it exists
            else if (roleConfig.syncId) {
                return [roleConfig.syncId];
            }
        }
    }
    
    return null;
};
