/**
 * Event handlers for reverse mode (synced → main)
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
  getSyncIdsForRole,
  addRoleWithSyncIdToMainServer,
  removeRoleWithSyncIdFromMainServer,
  hasRoleWithSyncId,
  getMainServerRoleWithSyncId
} from '../utils/index.js';
import { addRoleToMemberReverse } from '../commands/add.js';
import { removeRoleFromMemberReverse } from '../commands/remove.js';

/**
 * Sets up event handlers for reverse mode
 * @param {Object} client - Discord client
 * @param {Object} state - Bot state
 */
export const setupReverseModeEvents = (client, state) => {
  // When a users roles are updated in a synced server, update them in the main server.
  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    try {
      if (!state.triggeredByIntention && config.syncedServers.includes(newMember.guild.id)) {
        const oldRoles = oldMember._roles;
        const newRoles = newMember._roles;
        let results = [];

        if (oldRoles.length > newRoles.length) {
          // Roles were removed
          const roleToRemoveIds = oldRoles.filter(id => !newRoles.includes(id));
          
          // Process each removed role
          for (const roleToRemoveId of roleToRemoveIds) {
            const roleToRemove = oldMember.roles.cache.get(roleToRemoveId);
            if (roleToRemove) {
              // Check if the role has Sync IDs
              const syncIds = getSyncIdsForRole(roleToRemove, newMember.guild.id, client);
              
              if (syncIds && syncIds.length > 0) {
                // Process each Sync ID
                for (const syncId of syncIds) {
                  // Check if the user has any other roles with the same Sync ID in other synced servers
                  const otherSyncedServers = config.syncedServers.filter(id => id !== newMember.guild.id);
                  const hasOtherRolesWithSyncId = await hasRoleWithSyncId(
                    newMember.user.id, 
                    syncId, 
                    otherSyncedServers, 
                    client, 
                    state.cache, 
                    state.isDebug
                  );
                  
                  if (!hasOtherRolesWithSyncId) {
                    // If the user doesn't have any other roles with the same Sync ID, remove the role from the main server
                    state.triggeredByIntention = true;
                    const result = await removeRoleWithSyncIdFromMainServer(newMember, syncId, client, state);
                    state.triggeredByIntention = false;
                    results.push(result);
                  } else {
                    results.push({
                      success: true,
                      message: `Not removing role with Sync ID ${syncId} from main server because user has other roles with the same Sync ID in other synced servers`
                    });
                  }
                }
              } else {
                // Use traditional role removal by name
                const roleName = roleToRemove.name;
                const result = await removeRoleFromMemberReverse(newMember, roleName, client, state);
                results.push(result);
              }
            }
          }
        } else if (oldRoles.length < newRoles.length) {
          // Roles were added
          const roleToAddIds = newRoles.filter(id => !oldRoles.includes(id));
          
          // Process each added role
          for (const roleToAddId of roleToAddIds) {
            const roleToAdd = newMember.roles.cache.get(roleToAddId);
            if (roleToAdd) {
              // Check if the role has Sync IDs
              const syncIds = getSyncIdsForRole(roleToAdd, newMember.guild.id, client);
              
              if (syncIds && syncIds.length > 0) {
                // Use Sync ID-based role addition for each Sync ID
                state.triggeredByIntention = true;
                
                // Process each Sync ID
                for (const syncId of syncIds) {
                  const result = await addRoleWithSyncIdToMainServer(newMember, syncId, client, state);
                  results.push(result);
                }
                
                state.triggeredByIntention = false;
              } else {
                // Use traditional role addition by ID
                const result = await addRoleToMemberReverse(newMember, roleToAddId, client, state);
                results.push(result);
              }
            }
          }
        }

        // Log all successful results
        for (const result of results) {
          if (result && result.success) {
            await logToDiscord(
              client,
              result.message,
              'info',
              config
            );
          }
        }
      }
    } catch (error) {
      await logToDiscord(
        client,
        `Error handling role update for ${newMember.user.username}`,
        'error',
        config,
        error
      );
    }
  });

  // When a new user joins the main server, then look for that users roles in the synced servers and apply them in the main server.
  client.on('guildMemberAdd', async addedMember => {
    try {
      if (addedMember.guild.id === config.mainServer) {
        debugLog(`${addedMember.displayName} joined main server: ${addedMember.guild.name}`, state.isDebug);
        
        const mainServer = addedMember.guild;
        
        // Get or use cached roles for main server
        const mainServerRoles = await getGuildRoles(mainServer, state.cache, state.isDebug);
        
        const logChannel = await mainServer.channels.fetch(config.logChannelId);
        let rolesAdded = false;

        // Automatically check all synced servers for roles
        for (const server of config.syncedServers) {
          try {
            const guildToSync = await client.guilds.fetch(server);
            
            try {
              const memberToSync = await guildToSync.members.fetch(addedMember.user.id);
              
              if (memberToSync) {
                const thisServerRoles = [...memberToSync.roles.cache.values()].filter(r => r.name !== '@everyone');

                if (thisServerRoles.length > 0) {
                  for (const role of thisServerRoles) {
                    // Check if the role has Sync IDs
                    const syncIds = getSyncIdsForRole(role, guildToSync.id, client);
                    
                    if (syncIds && syncIds.length > 0) {
                      // Process each Sync ID
                      for (const syncId of syncIds) {
                        // Get the role with the same Sync ID in the main server
                        const roleToAdd = await getMainServerRoleWithSyncId(syncId, config.mainServer, client, state.cache, state.isDebug);
                        
                        if (roleToAdd) {
                          try {
                            await addRoleToMember(addedMember, roleToAdd);
                            rolesAdded = true;
                            debugLog(`Added role ${roleToAdd.name} (Sync ID: ${syncId}) to ${addedMember.displayName} in main server`, state.isDebug);
                          } catch (err) {
                            await logToDiscord(
                              client,
                              `Failed to add role ${roleToAdd.name} (Sync ID: ${syncId}) to ${addedMember.user.username} in main server`,
                              'error',
                              config,
                              err
                            );
                          }
                        }
                      }
                    } else {
                      // Use traditional role matching by name
                      const roleToAdd = mainServerRoles.find(r => r.name === role.name);
                      if (roleToAdd) {
                        try {
                          await addRoleToMember(addedMember, roleToAdd);
                          rolesAdded = true;
                          debugLog(`Added role ${roleToAdd.name} to ${addedMember.displayName} in main server`, state.isDebug);
                        } catch (err) {
                          await logToDiscord(
                            client,
                            `Failed to add role ${roleToAdd.name} to ${addedMember.user.username} in main server`,
                            'error',
                            config,
                            err
                          );
                        }
                      }
                    }
                  }

                  if (rolesAdded) {
                    await logChannel.send(`Syncing roles from server: ${guildToSync.name} for new member: ${addedMember.user.username}`);
                  }
                }
              }
            } catch (memberError) {
              debugLog(`Member ${addedMember.displayName} not found in ${guildToSync.name}`, state.isDebug);
              // This is an expected case, not an error
            }
          } catch (serverError) {
            await logToDiscord(
              client,
              `Error processing server ${server} for member addition`,
              'error',
              config,
              serverError
            );
          }
        }
        
        if (rolesAdded) {
          await logToDiscord(
            client,
            `Automatically synced roles from all synced servers for new member: ${addedMember.user.username} in main server`,
            'info',
            config
          );
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

  // When a user leaves or is kicked from a synced server, then remove all of matching roles from the main server,
  // but only if the role ID is not present in any other synced server.
  client.on('guildMemberRemove', async removedMember => {
    try {
      if (config.syncedServers.includes(removedMember.guild.id)) {
        debugLog(`${removedMember.displayName} left synced server: ${removedMember.guild.name}`, state.isDebug);

        const mainServer = await client.guilds.fetch(config.mainServer);
        
        try {
          const mainServerMember = await mainServer.members.fetch(removedMember.user.id);
          const logChannel = await mainServer.channels.fetch(config.logChannelId);

          const syncedServerMemberRoles = removedMember.roles.cache;
          let rolesRemoved = false;

          for (const role of syncedServerMemberRoles.values()) {
            if (role.name !== '@everyone') {
              // Check if the role has Sync IDs
              const syncIds = getSyncIdsForRole(role, removedMember.guild.id, client);
              
              if (syncIds && syncIds.length > 0) {
                // Process each Sync ID
                for (const syncId of syncIds) {
                  // Check if the user has any other roles with the same Sync ID in other synced servers
                  const otherSyncedServers = config.syncedServers.filter(id => id !== removedMember.guild.id);
                  const hasOtherRolesWithSyncId = await hasRoleWithSyncId(
                    removedMember.user.id, 
                    syncId, 
                    otherSyncedServers, 
                    client, 
                    state.cache, 
                    state.isDebug
                  );
                  
                  if (!hasOtherRolesWithSyncId) {
                    // If the user doesn't have any other roles with the same Sync ID, remove the role from the main server
                    const roleToRemove = await getMainServerRoleWithSyncId(syncId, config.mainServer, client, state.cache, state.isDebug);
                    
                    if (roleToRemove) {
                      try {
                        await removeRoleFromMember(mainServerMember, roleToRemove);
                        rolesRemoved = true;
                        debugLog(`Removed role ${roleToRemove.name} (Sync ID: ${syncId}) from ${mainServerMember.displayName} in main server`, state.isDebug);
                      } catch (err) {
                        await logToDiscord(
                          client,
                          `Failed to remove role ${roleToRemove.name} (Sync ID: ${syncId}) from ${mainServerMember.user.username} in main server`,
                          'error',
                          config,
                          err
                        );
                      }
                    }
                  } else {
                    debugLog(`Not removing role with Sync ID ${syncId} from ${mainServerMember.displayName} in main server because they have other roles with the same Sync ID in other synced servers`, state.isDebug);
                  }
                }
              } else {
                // Use traditional role matching by name
                const roleToRemove = mainServerMember.roles.cache.find(r => r.name === role.name);

                if (roleToRemove) {
                  // Check if the user has the same role name in other synced servers
                  const otherSyncedServers = config.syncedServers.filter(id => id !== removedMember.guild.id);
                  let hasRoleInOtherServers = false;
                  
                  for (const serverId of otherSyncedServers) {
                    try {
                      const server = await client.guilds.fetch(serverId);
                      try {
                        const member = await server.members.fetch(removedMember.user.id);
                        if (member) {
                          const memberRoles = member.roles.cache;
                          if (memberRoles.some(r => r.name === roleToRemove.name)) {
                            hasRoleInOtherServers = true;
                            break;
                          }
                        }
                      } catch (memberError) {
                        // User not in this server, continue checking others
                      }
                    } catch (serverError) {
                      console.error(`Error checking server ${serverId}:`, serverError);
                    }
                  }
                  
                  if (!hasRoleInOtherServers) {
                    try {
                      await removeRoleFromMember(mainServerMember, roleToRemove);
                      rolesRemoved = true;
                      debugLog(`Removed role ${roleToRemove.name} from ${mainServerMember.displayName} in main server`, state.isDebug);
                    } catch (err) {
                      await logToDiscord(
                        client,
                        `Failed to remove role ${roleToRemove.name} from ${mainServerMember.user.username} in main server`,
                        'error',
                        config,
                        err
                      );
                    }
                  } else {
                    debugLog(`Not removing role ${roleToRemove.name} from ${mainServerMember.displayName} in main server because they have the same role in other synced servers`, state.isDebug);
                  }
                }
              }
            }
          }

          if (rolesRemoved) {
            await logChannel.send(`Removing roles from: ${mainServerMember.user.username} in server: ${mainServer.name} since they left a synced server: ${removedMember.guild.name}`);
          }
        } catch (memberError) {
          debugLog(`Not removing roles from: ${removedMember.user.username} in main server since they aren't in the server.`, state.isDebug);
          // This is an expected case, not an error
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
