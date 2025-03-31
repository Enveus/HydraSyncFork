/**
 * Role checker command module
 */

import { config } from '../config/index.js';
import { 
  logToDiscord, 
  iterateThroughMembers, 
  getGuildRoles, 
  addRoleToMember, 
  removeRoleFromMember, 
  debugLog, 
  withRateLimitHandling 
} from '../utils/index.js';

/**
 * Role checker function for regular mode (main → synced)
 * @param {Object} interaction - Discord interaction
 * @param {boolean} forceSync - Whether to force sync roles
 * @param {Object} client - Discord client
 * @param {Object} state - Bot state
 */
export const roleCheckerRegular = async (interaction, forceSync, client, state) => {
  try {
    // Define the role analysis function
    const analyzeRoles = async (member, interaction, data, forceSync) => {
      try {
        // Get main server data
        const mainServer = interaction.guild;
        
        // Get or use cached roles for main server
        const mainServerRoles = await getGuildRoles(mainServer, state.cache, state.isDebug);
        
        const mainServerRoleNames = mainServerRoles.map(r => r.name);
        const mainServerPremiumRole = mainServer.roles.premiumSubscriberRole;
        
        const mainServerMe = await mainServer.members.fetchMe();
        const mainServerMeRole = mainServerMe.roles.botRole;
        const mainServerRolesHigherThanBot = mainServerRoles
          .filter(r => r.comparePositionTo(mainServerMeRole) > 0)
          .map(r => r.name);
        
        let memberObj = {
          username: member.displayName,
          serversWithDifferingRoles: []
        };
        
        let hasDifferingRoles = false;
        
        // Process each synced server
        for (const serverId of config.syncedServers) {
          try {
            const syncedServer = await client.guilds.fetch(serverId);
            
            // Get or use cached roles for synced server
            const syncedServerRoles = await getGuildRoles(syncedServer, state.cache, state.isDebug);
            
            const syncedServerRoleNames = syncedServerRoles.map(r => r.name);
            const syncedServerPremiumRole = syncedServer.roles.premiumSubscriberRole;
            
            const syncedMe = await syncedServer.members.fetchMe();
            const syncedMeRole = syncedMe.roles.botRole;
            const syncedServerRolesHigherThanBot = syncedServerRoles
              .filter(r => r.comparePositionTo(syncedMeRole) > 0)
              .map(r => r.name);
            
            try {
              // Try to get the member in the synced server
              const syncedMember = await syncedServer.members.fetch(member.id);
              
              if (syncedMember.manageable && !syncedMember.user.bot) {
                const syncedMemberRoles = syncedMember.roles.cache;
                const syncedMemberRoleNames = syncedMemberRoles.map(r => r.name);
                
                const mainMemberRoles = member.roles.cache;
                const mainMemberRoleNames = mainMemberRoles.map(r => r.name);
                
                // Determine roles to remove (in synced server but not in main)
                const roleCollectionToRemove = syncedMemberRoles
                  .filter(r => mainServerRoleNames.includes(r.name) && !mainMemberRoleNames.includes(r.name))
                  .filter(r => !mainServerRolesHigherThanBot.includes(r.name))
                  .filter(r => syncedServerPremiumRole && (r.name !== syncedServerPremiumRole.name));
                
                // Determine roles to add (in main but not in synced)
                const roleCollectionToAdd = mainMemberRoles
                  .filter(r => syncedServerRoleNames.includes(r.name) && !syncedMemberRoleNames.includes(r.name))
                  .filter(r => !syncedServerRolesHigherThanBot.includes(r.name))
                  .filter(r => mainServerPremiumRole && (r.name !== mainServerPremiumRole.name))
                  .map(role => syncedServerRoles.find(r => r.name === role.name));
                
                const rolesToRemoveInThisServer = [...roleCollectionToRemove.values()];
                const roleNamesToRemoveInThisServer = rolesToRemoveInThisServer.map(r => r.name);
                
                const rolesToAddInThisServer = [...roleCollectionToAdd.values()];
                const roleNamesToAddInThisServer = rolesToAddInThisServer.map(r => r.name);
                
                debugLog(`Roles ${syncedMember.displayName} has in ${syncedServer.name} but not in mainserver: ${roleNamesToRemoveInThisServer}`, state.isDebug);
                debugLog(`Roles ${syncedMember.displayName} has in mainserver but not in ${syncedServer.name}: ${roleNamesToAddInThisServer}`, state.isDebug);
                
                if (rolesToRemoveInThisServer.length > 0 || rolesToAddInThisServer.length > 0) {
                  hasDifferingRoles = true;
                  const remove = forceSync ? 'rolesRemovedToMatchMainserver' : 'rolesToRemoveToMatchMainserver';
                  const add = forceSync ? 'rolesAddedToMatchMainserver' : 'rolesToAddToMatchMainServer';
                  
                  // Handle role changes
                  if (rolesToRemoveInThisServer.length > 0 && rolesToAddInThisServer.length === 0) {
                    debugLog(`Roles to be removed: ${roleNamesToRemoveInThisServer} from ${syncedMember.displayName} in ${syncedServer.name}`, state.isDebug);
                    
                    if (forceSync) {
                      await withRateLimitHandling(async () => {
                        await syncedMember.roles.remove(rolesToRemoveInThisServer);
                      });
                    }
                    
                    memberObj.serversWithDifferingRoles.push({
                      serverName: syncedServer.name,
                      [`${remove}`]: roleNamesToRemoveInThisServer,
                    });
                  }
                  
                  if (rolesToAddInThisServer.length > 0 && rolesToRemoveInThisServer.length === 0) {
                    debugLog(`Roles to be added: ${roleNamesToAddInThisServer} to ${syncedMember.displayName} in ${syncedServer.name}`, state.isDebug);
                    
                    if (forceSync) {
                      await withRateLimitHandling(async () => {
                        await syncedMember.roles.add(rolesToAddInThisServer);
                      });
                    }
                    
                    memberObj.serversWithDifferingRoles.push({
                      serverName: syncedServer.name,
                      [`${add}`]: roleNamesToAddInThisServer,
                    });
                  }
                  
                  if (rolesToAddInThisServer.length > 0 && rolesToRemoveInThisServer.length > 0) {
                    debugLog(`Roles to be added and removed for ${syncedMember.displayName} in ${syncedServer.name}`, state.isDebug);
                    debugLog(`Add: ${roleNamesToAddInThisServer}`, state.isDebug);
                    debugLog(`Remove: ${roleNamesToRemoveInThisServer}`, state.isDebug);
                    
                    if (forceSync) {
                      debugLog(`Force syncing combination for: ${syncedMember.displayName}`, state.isDebug);
                      
                      await withRateLimitHandling(async () => {
                        await syncedMember.roles.remove(rolesToRemoveInThisServer);
                      });
                      
                      await withRateLimitHandling(async () => {
                        await syncedMember.roles.add(rolesToAddInThisServer);
                      });
                    }
                    
                    memberObj.serversWithDifferingRoles.push({
                      serverName: syncedServer.name,
                      [`${remove}`]: roleNamesToRemoveInThisServer,
                      [`${add}`]: roleNamesToAddInThisServer
                    });
                  }
                }
              } else {
                const reason = !syncedMember.manageable ? "Member is not manageable" : "Member is a bot";
                data.errors.push(`${syncedMember.displayName} in ${syncedServer.name}: ${reason}`);
                debugLog(`${syncedMember.displayName} in ${syncedServer.name}: ${reason}`, state.isDebug);
              }
            } catch (memberError) {
              // Member not found in synced server, which is fine
              debugLog(`${member.displayName} does not exist in ${syncedServer.name}`, state.isDebug);
            }
          } catch (serverError) {
            data.errors.push(`Error processing server ${serverId}: ${serverError.message}`);
            console.error(`Error processing server ${serverId}:`, serverError);
          }
        }
        
        if (hasDifferingRoles) {
          debugLog(`${member.displayName} has differing roles from mainserver`, state.isDebug);
          data.membersWithDifferences.push(memberObj);
        }
        
        data.membersAnalyzed++;
        return data;
      } catch (error) {
        data.errors.push(`Error analyzing roles for ${member.displayName}: ${error.message}`);
        console.error(`Error analyzing roles for ${member.displayName}:`, error);
        data.membersAnalyzed++;
        return data;
      }
    };
    
    // Define the callback function
    const analyzeCallback = async (interaction, data, forceSync) => {
      try {
        // Create JSON file with analysis results
        const resultsBuffer = Buffer.from(JSON.stringify(data, null, 4));
        
        // Create separate text file for errors if there are any
        let errorBuffer = null;
        if (data.errors.length > 0) {
          const errorText = data.errors.join('\n');
          errorBuffer = Buffer.from(errorText);
        }
        
        // Prepare files to send
        const files = [
          {
            attachment: resultsBuffer,
            name: `${interaction.guild.name}_results.json`,
          }
        ];
        
        // Add error file if there are errors
        if (errorBuffer) {
          files.push({
            attachment: errorBuffer,
            name: `${interaction.guild.name}_errors.txt`,
          });
        }
        
        // Send files to the user
        await interaction.user.send({
          content: `Role checker results for ${interaction.guild.name}:`,
          files: files,
        });
        
        const verb = forceSync ? "synced" : "analyzed";
        const executionTime = data.executionTime || "unknown";
        
        await interaction.editReply({
          content: `I finished ${verb} roles for ${data.membersAnalyzed} members in ${executionTime} seconds. There were ${data.errors.length} errors. Results sent to your DMs.`,
          ephemeral: true
        });
        
        await logToDiscord(
          client,
          `Role-checker completed: ${data.membersAnalyzed} members processed, ${data.membersWithDifferences.length} with differences, ${data.errors.length} errors`,
          'info',
          config
        );
      } catch (error) {
        console.error('Error in analyzeCallback:', error);
        
        if (interaction.deferred && !interaction.replied) {
          await interaction.editReply({
            content: 'An error occurred while sending the results. Check the logs for details.',
            ephemeral: true
          });
        }
        
        await logToDiscord(
          client,
          `Error in role-checker callback`,
          'error',
          config,
          error
        );
      } finally {
        state.triggeredByIntention = false;
      }
    };
    
    // Use the improved iterateThroughMembers helper
    await iterateThroughMembers(
      interaction,
      analyzeRoles,
      analyzeCallback,
      forceSync,
      20 // Process in batches of 20 members
    );
  } catch (error) {
    console.error('Error in roleChecker:', error);
    await logToDiscord(
      client,
      `Error in role-checker`,
      'error',
      config,
      error
    );
    
    if (interaction.deferred && !interaction.replied) {
      await interaction.editReply({
        content: 'An error occurred while checking roles. Check the logs for details.',
        ephemeral: true
      });
    }
    
    state.triggeredByIntention = false;
  }
};

/**
 * Role checker function for reverse mode (synced → main)
 * @param {Object} interaction - Discord interaction
 * @param {boolean} forceSync - Whether to force sync roles
 * @param {Object} client - Discord client
 * @param {Object} state - Bot state
 */
export const roleCheckerReverse = async (interaction, forceSync, client, state) => {
  try {
    // Define the role analysis function
    const analyzeRoles = async (member, interaction, data, forceSync) => {
      let memberMainserverRolesCollection = member.roles.cache;
      let memberMainServerRolesArrayStrings = memberMainserverRolesCollection.map(role => role.name);
      let memberObj = {
        username: member.displayName,
        serversWithDifferingRoles: [],
      };
      let hasDifferingRoles = false;

      for (const server of config.syncedServers) {
        try {
          const fetchedServer = await client.guilds.fetch(server);
          
          // Get or use cached roles for synced server
          const fetchedServerRoles = await getGuildRoles(fetchedServer, state.cache, state.isDebug);
          
          if (fetchedServer.ownerId === interaction.member.id) {
            try {
              const membersInFetchedServer = await fetchedServer.members.fetch();
              const memberInFetchedServer = membersInFetchedServer.get(member.id);
              
              if (memberInFetchedServer) {
                const membersRolesInFetchedServer = memberInFetchedServer.roles.cache;
                const membersRolesInFetchedServerAsStrings = membersRolesInFetchedServer.map((role) => role.name);
                
                // In reverse mode, we need to sync from synced servers to main server
                // So the logic is reversed compared to regular mode
                
                // Roles that need added to the main server to match the roles the user has in the synced server
                const rolesCollectionToAddToMainServer = membersRolesInFetchedServer.filter(
                  (r) => !memberMainServerRolesArrayStrings.includes(r.name)
                );
                
                // Roles that need removed from the main server if they don't exist in the synced server
                const rolesCollectionToRemoveFromMainServer = memberMainserverRolesCollection
                  .filter((r) => !membersRolesInFetchedServerAsStrings.includes(r.name));

                const rolesToAddToMainServer = [...rolesCollectionToAddToMainServer.values()];
                const rolesToRemoveFromMainServer = [...rolesCollectionToRemoveFromMainServer.values()];
                
                if (rolesToAddToMainServer.length > 0 || rolesToRemoveFromMainServer.length > 0) {
                  hasDifferingRoles = true;
                  const add = forceSync ? "rolesAddedToMainServer" : "rolesToAddToMainServer";
                  const remove = forceSync ? "rolesRemovedFromMainServer" : "rolesToRemoveFromMainServer";
                  
                  if (rolesToAddToMainServer.length > 0 && rolesToRemoveFromMainServer.length === 0) {
                    if (forceSync) {
                      // Find matching roles in main server by name
                      const mainServerRolesToAdd = rolesToAddToMainServer
                        .map(role => {
                          const mainRole = mainServerRoles.find(r => r.name === role.name);
                          return mainRole;
                        })
                        .filter(role => role !== undefined);
                      
                      if (mainServerRolesToAdd.length > 0) {
                        await withRateLimitHandling(async () => {
                          await member.roles.add(mainServerRolesToAdd);
                        });
                      }
                    }

                    memberObj.serversWithDifferingRoles.push({
                      serverName: fetchedServer.name,
                      [`${add}`]: rolesToAddToMainServer.map((role) => role.name),
                    });
                  }
                  
                  if (rolesToRemoveFromMainServer.length > 0 && rolesToAddToMainServer.length === 0) {
                    if (forceSync) {
                      await withRateLimitHandling(async () => {
                        await member.roles.remove(rolesToRemoveFromMainServer);
                      });
                    }

                    memberObj.serversWithDifferingRoles.push({
                      serverName: fetchedServer.name,
                      [`${remove}`]: rolesToRemoveFromMainServer.map((role) => role.name),
                    });
                  }
                  
                  if (rolesToAddToMainServer.length > 0 && rolesToRemoveFromMainServer.length > 0) {
                    if (forceSync) {
                      // Find matching roles in main server by name
                      const mainServerRolesToAdd = rolesToAddToMainServer
                        .map(role => {
                          const mainRole = mainServerRoles.find(r => r.name === role.name);
                          return mainRole;
                        })
                        .filter(role => role !== undefined);
                      
                      await withRateLimitHandling(async () => {
                        await member.roles.remove(rolesToRemoveFromMainServer);
                      });
                      
                      if (mainServerRolesToAdd.length > 0) {
                        await withRateLimitHandling(async () => {
                          await member.roles.add(mainServerRolesToAdd);
                        });
                      }
                    }

                    memberObj.serversWithDifferingRoles.push({
                      serverName: fetchedServer.name,
                      [`${add}`]: rolesToAddToMainServer.map((role) => role.name),
                      [`${remove}`]: rolesToRemoveFromMainServer.map((role) => role.name),
                    });
                  }
                }
              }
            } catch (memberError) {
              data.errors.push(`Error processing member in ${fetchedServer.name}: ${memberError.message}`);
              console.error(`Error processing member in ${fetchedServer.name}:`, memberError);
            }
          }
        } catch (serverError) {
          data.errors.push(`Error processing server ${server}: ${serverError.message}`);
          console.error(`Error processing server ${server}:`, serverError);
        }
      }

      if (hasDifferingRoles) {
        data.membersWithDifferences.push(memberObj);
      }

      data.membersAnalyzed++;
      return data;
    };

    // Define the callback function
    const analyzeCallback = async (interaction, data, forceSync) => {
      try {
        // Create JSON file with analysis results
        const resultsBuffer = Buffer.from(JSON.stringify(data, null, 4));
        
        // Create separate text file for errors if there are any
        let errorBuffer = null;
        if (data.errors.length > 0) {
          const errorText = data.errors.join('\n');
          errorBuffer = Buffer.from(errorText);
        }
        
        // Prepare files to send
        const files = [
          {
            attachment: resultsBuffer,
            name: `${interaction.guild.name}_results.json`,
          }
        ];
        
        // Add error file if there are errors
        if (errorBuffer) {
          files.push({
            attachment: errorBuffer,
            name: `${interaction.guild.name}_errors.txt`,
          });
        }
        
        // Send files to the user
        await interaction.user.send({
          content: `Role checker results for ${interaction.guild.name}:`,
          files: files,
        });

        const verb = forceSync ? "synced" : "analyzed";
        const executionTime = data.executionTime || "unknown";
        
        await interaction.editReply({
          content: `I finished ${verb} roles for ${data.membersAnalyzed} members in ${executionTime} seconds. There were ${data.errors.length} errors. Results sent to your DMs.`,
          ephemeral: true
        });
        
        await logToDiscord(
          client,
          `Role-checker completed: ${data.membersAnalyzed} members processed, ${data.membersWithDifferences.length} with differences, ${data.errors.length} errors`,
          'info',
          config
        );
      } catch (error) {
        console.error('Error in analyzeCallback:', error);
        
        if (interaction.deferred && !interaction.replied) {
          await interaction.editReply({
            content: 'An error occurred while sending the results. Check the logs for details.',
            ephemeral: true
          });
        }
        
        await logToDiscord(
          client,
          `Error in role-checker callback`,
          'error',
          config,
          error
        );
      } finally {
        state.triggeredByIntention = false;
      }
    };

    // Use the improved iterateThroughMembers helper
    await iterateThroughMembers(
      interaction,
      analyzeRoles,
      analyzeCallback,
      forceSync,
      20 // Process in batches of 20 members
    );
  } catch (error) {
    console.error('Error in roleChecker:', error);
    await logToDiscord(
      client,
      `Error in role-checker`,
      'error',
      config,
      error
    );
    
    if (interaction.deferred && !interaction.replied) {
      await interaction.editReply({
        content: 'An error occurred while checking roles. Check the logs for details.',
        ephemeral: true
      });
    }
    
    state.triggeredByIntention = false;
  }
};
