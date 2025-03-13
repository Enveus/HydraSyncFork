/**
 * Remove command module
 */

import { config } from '../config/index.js';
import { 
  logToDiscord, 
  respondToInteraction, 
  getGuildRoles, 
  removeRoleFromMember, 
  debugLog 
} from '../utils/index.js';

/**
 * Removes a role from a member across all synced servers
 * @param {Object} member - Discord member object
 * @param {string} roleId - Role ID to remove
 * @param {Object} interaction - Optional interaction object
 * @param {Object} client - Discord client
 * @param {Object} state - Bot state
 */
export const removeRole = async (member, roleId, interaction = null, client, state) => {
  try {
    const mainServer = await client.guilds.fetch(config.mainServer);
    const mainServerRoleToRemove = await mainServer.roles.fetch(roleId);

    if (interaction) {
      try {
        await member.roles.remove(mainServerRoleToRemove);
        await logToDiscord(
          client,
          `Removed role ${mainServerRoleToRemove.name} from ${member.user.username} in main server`,
          'success',
          config
        );
      } catch (err) {
        await logToDiscord(
          client,
          `Error removing role ${mainServerRoleToRemove.name} from ${member.user.username} in main server`,
          'error',
          config,
          err
        );
        await respondToInteraction(interaction, 'There was an error removing the role in the main server, see console for error', err, client, config);
        return;
      }
    }
    
    for (const server of config.syncedServers) {
      try {
        const serverToSync = await client.guilds.fetch(server);
        
        // Get or use cached roles
        const serverToSyncRoles = await getGuildRoles(serverToSync, state.cache, state.isDebug);
        
        const syncedServerRoleToRemove = serverToSyncRoles.find(r => r.name === mainServerRoleToRemove.name);
        let memberToSync = serverToSync.members.cache.find(m => m.id === member.id);

        if (memberToSync && syncedServerRoleToRemove) {
          let memberHasRole = memberToSync.roles.cache.find(a => a.name === syncedServerRoleToRemove.name);

          if (memberHasRole) {
            try {
              await removeRoleFromMember(memberToSync, syncedServerRoleToRemove);
              
              await respondToInteraction(interaction, `Removed ${mainServerRoleToRemove.name} from ${member.user.username} in ${serverToSync.name}`, null, client, config);
              await logToDiscord(
                client,
                `Removed role ${mainServerRoleToRemove.name} from ${member.user.username} in ${serverToSync.name}`,
                'success',
                config
              );
            } catch (err) {
              await logToDiscord(
                client,
                `Error removing role ${mainServerRoleToRemove.name} from ${member.user.username} in ${serverToSync.name}`,
                'error',
                config,
                err
              );
              await respondToInteraction(interaction, `There was an error removing the role in a synced server named: ${serverToSync.name}, see console for error`, err, client, config);
            }
          } else {
            await respondToInteraction(interaction, `${member.user.username} did not have role: ${mainServerRoleToRemove.name} in ${serverToSync.name} to remove.`, null, client, config);
          }
        } else if (!syncedServerRoleToRemove) {
          await respondToInteraction(interaction, `Unable to remove role ${mainServerRoleToRemove.name} from ${member.user.username} in ${serverToSync.name}, role does not exist.`, null, client, config);
        } else {
          // Member not in cache, fetch all members
          try {
            const updatedMembers = await serverToSync.members.fetch();
            const updatedMember = updatedMembers.find(m => m.id === member.id);
            
            if (updatedMember && syncedServerRoleToRemove) {
              try {
                await removeRoleFromMember(updatedMember, syncedServerRoleToRemove);
                
                await respondToInteraction(interaction, `Removed ${mainServerRoleToRemove.name} from ${member.user.username} in ${serverToSync.name}`, null, client, config);
                await logToDiscord(
                  client,
                  `Removed role ${mainServerRoleToRemove.name} from ${member.user.username} in ${serverToSync.name}`,
                  'success',
                  config
                );
              } catch (err) {
                await logToDiscord(
                  client,
                  `Error removing role ${mainServerRoleToRemove.name} from ${member.user.username} in ${serverToSync.name}`,
                  'error',
                  config,
                  err
                );
                await respondToInteraction(interaction, 'There was an error removing the role in the secondary server after fetching all users, see console for error', err, client, config);
              }
            } else {
              await respondToInteraction(interaction, `Unable to remove role ${mainServerRoleToRemove.name} from ${member.user.username} in ${serverToSync.name}, member does not exist.`, null, client, config);
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
          `Error processing server ${server} for role removal`,
          'error',
          config,
          err
        );
        await respondToInteraction(interaction, `Error processing server ${server} for role removal`, err, client, config);
      }
    }
  } catch (err) {
    await logToDiscord(
      client,
      `General error in removeRole function`,
      'error',
      config,
      err
    );
    await respondToInteraction(interaction, 'There was a general error in the removeRole function', err, client, config);
  }
};

/**
 * Removes a role from a member in the main server (reverse mode)
 * @param {Object} member - Discord member object from synced server
 * @param {string} roleName - Role name to remove
 * @param {Object} client - Discord client
 * @param {Object} state - Bot state
 * @returns {Promise<Object>} Result of the operation
 */
export const removeRoleFromMemberReverse = async (member, roleName, client, state) => {
  try {
    const mainServer = await client.guilds.fetch(config.mainServer);
    
    // Get or use cached roles for main server
    const mainServerRoles = await getGuildRoles(mainServer, state.cache, state.isDebug);
    
    let mainServerMember;
    try {
      mainServerMember = await mainServer.members.fetch(member.id);
    } catch (err) {
      return { success: false, message: `User not found in main server` };
    }
    
    const mainServerRoleToRemove = mainServerRoles.find(r => r.name === roleName);

    if (mainServerRoleToRemove) {
      await removeRoleFromMember(mainServerMember, mainServerRoleToRemove);
      
      return { 
        success: true, 
        message: `Removed ${mainServerRoleToRemove.name} from ${mainServerMember.user.username} in ${mainServer.name}` 
      };
    } else {
      return { 
        success: false, 
        message: `Role ${roleName} does not exist in main server` 
      };
    }
  } catch (err) {
    console.error(err);
    return { success: false, message: 'There was an error while removing the role.' };
  }
};

/**
 * Handles remove role interaction
 * @param {Object} interaction - Discord interaction
 * @param {Object} member - Discord member object
 * @param {string} roleId - Role ID to remove
 * @param {Object} client - Discord client
 * @param {Object} state - Bot state
 * @param {boolean} isReverseMode - Whether the bot is in reverse mode
 */
export const handleRemoveRoleInteraction = async (interaction, member, roleId, client, state, isReverseMode) => {
  try {
    if (isReverseMode) {
      const role = await member.guild.roles.fetch(roleId);
      const result = await removeRoleFromMemberReverse(member, role.name, client, state);

      if (result.success) {
        await interaction.editReply({ content: result.message });
      } else {
        await interaction.editReply({ content: result.message, ephemeral: true });
      }
    } else {
      await removeRole(member, roleId, interaction, client, state);
    }
  } catch (error) {
    console.error('handleRemoveRoleInteraction error:', error);
    await interaction.editReply({ content: 'An internal error occurred while executing your command.', ephemeral: true });
  }
};
