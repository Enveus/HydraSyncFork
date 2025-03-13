/**
 * Event handlers for regular mode (main → synced)
 */

import { config } from '../config/index.js';
import { 
  logToDiscord, 
  getGuildRoles, 
  addRoleToMember, 
  removeRoleFromMember, 
  debugLog, 
  withRateLimitHandling,
  getSyncIdForRole,
  addRoleWithSyncIdToSyncedServers,
  removeRoleWithSyncIdFromSyncedServers,
  getServerRolesWithSyncId
} from '../utils/index.js';
import { addRole } from '../commands/add.js';
import { removeRole } from '../commands/remove.js';

/**
 * Sets up event handlers for regular mode
 * @param {Object} client - Discord client
 * @param {Object} state - Bot state
 */
export const setupRegularModeEvents = (client, state) => {
  // When a users roles are updated in the main server, update them in all synced servers.
  client.on('guildMemberUpdate', async (oldMember, updatedMember) => {
    try {
      if (!state.triggeredByIntention && (updatedMember.guild.id === config.mainServer)) {
        const oldRoles = oldMember.roles.cache;
        const newRoles = updatedMember.roles.cache;

        let oldRolesIds = oldRoles.map(r => r.id);
        let newRolesIds = newRoles.map(r => r.id);

        if (oldRolesIds.length > newRolesIds.length) {
          // Roles were removed
          const rolesToRemove = oldRoles.filter(role => !newRolesIds.includes(role.id));
          
          // Process each removed role
          for (const roleToRemove of rolesToRemove.values()) {
            // Check if the role has a Sync ID
            const syncId = getSyncIdForRole(roleToRemove, config.mainServer, client);
            
            if (syncId) {
              // Use Sync ID-based role removal
              state.triggeredByIntention = true;
              const result = await removeRoleWithSyncIdFromSyncedServers(updatedMember, syncId, client, state);
              state.triggeredByIntention = false;
              
              await logToDiscord(
                client, 
                `Role ${roleToRemove.name} (Sync ID: ${syncId}) was removed from ${updatedMember.user.username} in main server and synced to all servers: ${result.message}`, 
                'info', 
                config
              );
            } else {
              // Use traditional role removal by name
              await removeRole(updatedMember, roleToRemove.id, null, client, state);
              await logToDiscord(
                client, 
                `Role ${roleToRemove.name} was removed from ${updatedMember.user.username} in main server and synced to all servers`, 
                'info', 
                config
              );
            }
          }
        }

        if (oldRolesIds.length < newRolesIds.length) {
          // Roles were added
          const rolesToAdd = newRoles.filter(role => !oldRolesIds.includes(role.id));
          
          // Process each added role
          for (const roleToAdd of rolesToAdd.values()) {
            // Check if the role has a Sync ID
            const syncId = getSyncIdForRole(roleToAdd, config.mainServer, client);
            
            if (syncId) {
              // Use Sync ID-based role addition
              state.triggeredByIntention = true;
              const result = await addRoleWithSyncIdToSyncedServers(updatedMember, syncId, client, state);
              state.triggeredByIntention = false;
              
              await logToDiscord(
                client, 
                `Role ${roleToAdd.name} (Sync ID: ${syncId}) was added to ${updatedMember.user.username} in main server and synced to all servers: ${result.message}`, 
                'info', 
                config
              );
            } else {
              // Use traditional role addition by name
              await addRole(updatedMember, roleToAdd.id, null, client, state);
              await logToDiscord(
                client, 
                `Role ${roleToAdd.name} was added to ${updatedMember.user.username} in main server and synced to all servers`, 
                'info', 
                config
              );
            }
          }
        }
      }
    } catch (error) {
      await logToDiscord(
        client, 
        `Error handling role update for ${updatedMember.user.username}`, 
        'error', 
        config, 
        error
      );
    }
  });

  // When a new user joins a synced server, then look for that users roles in the main server and apply them in the synced server.
  client.on('guildMemberAdd', async addedMember => {
    try {
      debugLog(`${addedMember.displayName} joined ${addedMember.guild.name}`, state.isDebug);
      if (config.syncedServers.includes(addedMember.guild.id)) {
        debugLog(`Config lists ${addedMember.guild.name} as synced server.`, state.isDebug);
        
        // Get main server using rate limit handling
        const mainServer = await withRateLimitHandling(async () => {
          return await client.guilds.fetch(config.mainServer);
        });
        
        debugLog(`Fetched mainserver: ${mainServer.name}`, state.isDebug);
        
        try {
          const mainServerMember = await mainServer.members.fetch(addedMember.user.id);
          debugLog(`Found member in mainserver: ${mainServerMember.displayName}`, state.isDebug);
          
          let mainServerMemberRoles = mainServerMember.roles.cache;
          let mainServerMemberRolesFiltered = mainServerMemberRoles.filter(r => r.name !== '@everyone');
          debugLog(`Found ${mainServerMemberRolesFiltered.size} member roles for ${addedMember.displayName} in mainserver: ${mainServerMemberRolesFiltered.map(r => r.name)}`, state.isDebug);
          
          const guildToSync = addedMember.guild;
          let memberToSync = addedMember;
          
          if (mainServerMemberRolesFiltered.size > 0) {
            debugLog(`Adding roles from mainserver: ${mainServerMemberRolesFiltered.map(r => r.name)} for ${addedMember.displayName} in ${addedMember.guild.name}`, state.isDebug);

            // Get or use cached roles
            const guildToSyncRoles = await getGuildRoles(guildToSync, state.cache, state.isDebug);
            
            const logChannel = await mainServer.channels.fetch(config.logChannelId);
            
            // Process roles in sequence to avoid rate limits
            for (const role of mainServerMemberRolesFiltered.values()) {
              // Check if the role has a Sync ID
              const syncId = getSyncIdForRole(role, config.mainServer, client);
              
              if (syncId) {
                // Get roles with the same Sync ID in the synced server
                const rolesToAdd = await getServerRolesWithSyncId(syncId, guildToSync.id, client, state.cache, state.isDebug);
                
                for (const roleToAdd of rolesToAdd) {
                  try {
                    await addRoleToMember(memberToSync, roleToAdd);
                    debugLog(`Added role ${roleToAdd.name} (Sync ID: ${syncId}) to ${memberToSync.displayName}`, state.isDebug);
                  } catch (err) {
                    await logToDiscord(
                      client, 
                      `Failed to add role ${roleToAdd.name} (Sync ID: ${syncId}) to ${memberToSync.user.username} in ${guildToSync.name}`, 
                      'error', 
                      config, 
                      err
                    );
                  }
                }
              } else {
                // Use traditional role matching by name
                const roleToAdd = guildToSyncRoles.find(r => r.name === role.name);
                if (roleToAdd && roleToAdd.id && roleToAdd.name) {
                  try {
                    await addRoleToMember(memberToSync, roleToAdd);
                    debugLog(`Added role ${roleToAdd.name} to ${memberToSync.displayName}`, state.isDebug);
                  } catch (err) {
                    await logToDiscord(
                      client, 
                      `Failed to add role ${roleToAdd.name} to ${memberToSync.user.username} in ${guildToSync.name}`, 
                      'error', 
                      config, 
                      err
                    );
                  }
                }
              }
            }
            
            await logChannel.send(`Syncing roles in server: ${guildToSync.name} for new member: ${memberToSync.user.username}`);
          }
        } catch (e) {
          debugLog(`Not adding any roles for ${addedMember.displayName} because they aren't in the main server`, state.isDebug);
          // This is an expected case, not an error
        }
      }
    } catch (error) {
      await logToDiscord(
        client, 
        `Error handling member join for ${addedMember.user.username} in ${addedMember.guild.name}`, 
        'error', 
        config, 
        error
      );
    }
  });

  // When a user leaves the main server, then remove all of matching roles from all synced servers.
  client.on('guildMemberRemove', async removedMember => {
    try {
      if (removedMember.guild.id === config.mainServer) {
        debugLog(`${removedMember.displayName} left mainserver: ${removedMember.guild.name}`, state.isDebug);

        const mainServer = await client.guilds.fetch(config.mainServer);
        let mainServerMember = removedMember;
        let mainServerMemberRoles = mainServerMember.roles.cache;
        let mainServerMemberRoleIds = mainServerMemberRoles.filter(r => r.name !== '@everyone').map(r => r.id);
        
        // Get or use cached roles
        const mainServerRoles = await getGuildRoles(mainServer, state.cache, state.isDebug);
        
        let mainServerRoleNames = mainServerMemberRoles.filter(r => r.name !== '@everyone').map(r => r.name);
        
        // Only proceed if there are roles to remove
        if (mainServerMemberRoleIds.length > 0) {
          const logChannel = await mainServer.channels.fetch(config.logChannelId);

          for (const server of config.syncedServers) {
            try {
              const guildToSync = await client.guilds.fetch(server);
              debugLog(`Removing roles ${mainServerRoleNames} from ${removedMember.displayName} in: ${guildToSync.name}`, state.isDebug);

              try {
                const memberToSync = await guildToSync.members.fetch(removedMember.user.id);
                debugLog(`Removing ${mainServerRoleNames} from ${removedMember.displayName} in ${guildToSync.name}`, state.isDebug);
                
                // Get or use cached roles for synced server
                const syncedServerRoles = await getGuildRoles(guildToSync, state.cache, state.isDebug);
                
                // Process roles in sequence to avoid rate limits
                for (const roleId of mainServerMemberRoleIds) {
                  const mainServerRole = mainServerRoles.find(r => r.id === roleId);
                  if (mainServerRole) {
                    // Check if the role has a Sync ID
                    const syncId = getSyncIdForRole(mainServerRole, config.mainServer, client);
                    
                    if (syncId) {
                      // Get roles with the same Sync ID in the synced server
                      const rolesToRemove = await getServerRolesWithSyncId(syncId, guildToSync.id, client, state.cache, state.isDebug);
                      
                      for (const roleToRemove of rolesToRemove) {
                        try {
                          await removeRoleFromMember(memberToSync, roleToRemove);
                          debugLog(`Removed role ${roleToRemove.name} (Sync ID: ${syncId}) from ${memberToSync.displayName}`, state.isDebug);
                        } catch (err) {
                          await logToDiscord(
                            client, 
                            `Failed to remove role ${roleToRemove.name} (Sync ID: ${syncId}) from ${memberToSync.user.username} in ${guildToSync.name}`, 
                            'error', 
                            config, 
                            err
                          );
                        }
                      }
                    } else {
                      // Use traditional role matching by name
                      const roleToRemove = syncedServerRoles.find(r => r.name === mainServerRole.name);
                      if (roleToRemove) {
                        try {
                          await removeRoleFromMember(memberToSync, roleToRemove);
                          debugLog(`Removed role ${roleToRemove.name} from ${memberToSync.displayName}`, state.isDebug);
                        } catch (err) {
                          await logToDiscord(
                            client, 
                            `Failed to remove role ${roleToRemove.name} from ${memberToSync.user.username} in ${guildToSync.name}`, 
                            'error', 
                            config, 
                            err
                          );
                        }
                      }
                    }
                  }
                }
                
                await logChannel.send(`Removing roles from: ${memberToSync.user.username} in server: ${guildToSync.name} since they left the main server`);
              } catch (e) {
                debugLog(`Not removing roles from ${removedMember.displayName} in ${guildToSync.name} because they aren't in that server.`, state.isDebug);
                // This is an expected case, not an error
              }
            } catch (serverError) {
              await logToDiscord(
                client, 
                `Error processing server ${server} for member removal`, 
                'error', 
                config, 
                serverError
              );
            }
          }
        }
      }
    } catch (error) {
      await logToDiscord(
        client, 
        `Error handling member leave for ${removedMember.user.username} from ${removedMember.guild.name}`, 
        'error', 
        config, 
        error
      );
    }
  });
};
