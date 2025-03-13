/**
 * Add command module
 */

import { config } from '../config/index.js';
import { 
  logToDiscord, 
  respondToInteraction, 
  getGuildRoles, 
  addRoleToMember, 
  debugLog 
} from '../utils/index.js';

/**
 * Adds a role to a member across all synced servers
 * @param {Object} member - Discord member object
 * @param {string} roleId - Role ID to add
 * @param {Object} interaction - Optional interaction object
 * @param {Object} client - Discord client
 * @param {Object} state - Bot state
 */
export const addRole = async (member, roleId, interaction = null, client, state) => {
  try {
    const mainServer = await client.guilds.fetch(config.mainServer);
    const mainServerRoleToAdd = await mainServer.roles.fetch(roleId);

    if (interaction) {
      try {
        await member.roles.add(mainServerRoleToAdd);
        await logToDiscord(
          client,
          `Added role ${mainServerRoleToAdd.name} to ${member.user.username} in main server`,
          'success',
          config
        );
      } catch (err) {
        await logToDiscord(
          client,
          `Error adding role ${mainServerRoleToAdd.name} to ${member.user.username} in main server`,
          'error',
          config,
          err
        );
        await respondToInteraction(interaction, 'There was an error adding the role in the main server, see console for error', err, client, config);
        return;
      }
    }
    
    for (const server of config.syncedServers) {
      try {
        // Get the server to sync
        const serverToSync = await client.guilds.fetch(server);
        
        // Get or use cached roles
        const serverToSyncRoles = await getGuildRoles(serverToSync, state.cache, state.isDebug);
        
        const syncedServerRoleToAdd = serverToSyncRoles.find(r => r.name === mainServerRoleToAdd.name);
        
        // Try to find the member in the cache first
        let memberToSync = serverToSync.members.cache.find(m => m.id === member.id);
        
        if (memberToSync && syncedServerRoleToAdd) {
          try {
            await addRoleToMember(memberToSync, syncedServerRoleToAdd);
            
            await respondToInteraction(interaction, `Added ${mainServerRoleToAdd.name} to ${member.user.username} in ${serverToSync.name}`, null, client, config);
            await logToDiscord(
              client,
              `Added role ${mainServerRoleToAdd.name} to ${member.user.username} in ${serverToSync.name}`,
              'success',
              config
            );
          } catch (err) {
            await logToDiscord(
              client,
              `Error adding role ${mainServerRoleToAdd.name} to ${member.user.username} in ${serverToSync.name}`,
              'error',
              config,
              err
            );
            await respondToInteraction(interaction, `There was an error adding the role in a synced server named: ${serverToSync.name}, see console for error`, err, client, config);
          }
        } else if (!syncedServerRoleToAdd) {
          await respondToInteraction(interaction, `Unable to add role ${mainServerRoleToAdd.name} to ${member.user.username} in ${serverToSync.name}, role does not exist.`, null, client, config);
        } else {
          // Member not in cache, fetch all members
          try {
            const updatedMembers = await serverToSync.members.fetch();
            const updatedMember = updatedMembers.find(m => m.id === member.id);
            
            if (updatedMember && syncedServerRoleToAdd) {
              try {
                await addRoleToMember(updatedMember, syncedServerRoleToAdd);
                
                await respondToInteraction(interaction, `Added ${mainServerRoleToAdd.name} to ${member.user.username} in ${serverToSync.name}`, null, client, config);
                await logToDiscord(
                  client,
                  `Added role ${mainServerRoleToAdd.name} to ${member.user.username} in ${serverToSync.name}`,
                  'success',
                  config
                );
              } catch (err) {
                await logToDiscord(
                  client,
                  `Error adding role ${mainServerRoleToAdd.name} to ${member.user.username} in ${serverToSync.name}`,
                  'error',
                  config,
                  err
                );
                await respondToInteraction(interaction, 'There was an error adding the role in the secondary server after fetching all users, see console for error', err, client, config);
              }
            } else {
              await respondToInteraction(interaction, `Unable to add role ${mainServerRoleToAdd.name} to ${member.user.username} in ${serverToSync.name}, member does not exist.`, null, client, config);
            }
          } catch (err) {
            await logToDiscord(
              client,
              `Error fetching members in ${serverToSync.name}`,
              'error',
              config,
              err
            );
            await respondToInteraction(interaction, `Error fetching members in ${serverToSync.name}`, err, client, config);
          }
        }
      } catch (err) {
        await logToDiscord(
          client,
          `Error processing server ${server} for role addition`,
          'error',
          config,
          err
        );
        await respondToInteraction(interaction, `Error processing server ${server} for role addition`, err, client, config);
      }
    }
  } catch (err) {
    await logToDiscord(
      client,
      `General error in addRole function`,
      'error',
      config,
      err
    );
    await respondToInteraction(interaction, 'There was a general error in the addRole function', err, client, config);
  }
};

/**
 * Adds a role to a member in the main server (reverse mode)
 * @param {Object} member - Discord member object from synced server
 * @param {string} roleId - Role ID to add
 * @param {Object} client - Discord client
 * @param {Object} state - Bot state
 * @returns {Promise<Object>} Result of the operation
 */
export const addRoleToMemberReverse = async (member, roleId, client, state) => {
  try {
    const mainServer = await client.guilds.fetch(config.mainServer);
    const serverCommandWasInRoleToAdd = await member.guild.roles.fetch(roleId);
    
    let mainServerMember;
    try {
      mainServerMember = await mainServer.members.fetch(member.id);
    } catch (err) {
      return { success: false, message: `User not found in main server` };
    }
    
    // Get or use cached roles for main server
    const mainServerRoles = await getGuildRoles(mainServer, state.cache, state.isDebug);
    
    const mainServerRoleToAdd = mainServerRoles.find(r => r.name === serverCommandWasInRoleToAdd.name);

    if (mainServerRoleToAdd) {
      await addRoleToMember(mainServerMember, mainServerRoleToAdd);
      
      return { 
        success: true, 
        message: `Added ${mainServerRoleToAdd.name} to ${mainServerMember.user.username} in ${mainServer.name}` 
      };
    } else {
      return { 
        success: false, 
        message: `Role ${serverCommandWasInRoleToAdd.name} does not exist in main server` 
      };
    }
  } catch (err) {
    console.error(err);
    return { success: false, message: 'There was an error while adding the role.' };
  }
};

/**
 * Handles add role interaction
 * @param {Object} interaction - Discord interaction
 * @param {Object} member - Discord member object
 * @param {string} roleId - Role ID to add
 * @param {Object} client - Discord client
 * @param {Object} state - Bot state
 * @param {boolean} isReverseMode - Whether the bot is in reverse mode
 */
export const handleAddRoleInteraction = async (interaction, member, roleId, client, state, isReverseMode) => {
  try {
    if (isReverseMode) {
      const result = await addRoleToMemberReverse(member, roleId, client, state);

      if (result.success) {
        await interaction.editReply({ content: result.message });
      } else {
        await interaction.editReply({ content: result.message, ephemeral: true });
      }
    } else {
      await addRole(member, roleId, interaction, client, state);
    }
  } catch (error) {
    console.error('handleAddRoleInteraction error:', error);
    await interaction.editReply({ content: 'An internal error occurred while executing your command.', ephemeral: true });
  }
};
