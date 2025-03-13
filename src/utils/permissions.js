/**
 * Utility functions for handling permissions
 */

/**
 * Verifies that the user has permission to use commands
 * @param {Object} client - Discord client
 * @param {string} userId - User ID to verify
 * @param {Object} config - Bot configuration
 * @param {string} guildId - Guild ID (defaults to main server)
 * @returns {Promise<boolean>} Whether the user has permission
 */
export const verifyUser = async (client, userId, config, guildId = null) => {
  try {
    const guild = await client.guilds.fetch(guildId || config.mainServer);
    const member = await guild.members.fetch(userId);
    
    const hasAllowedRole = config.allowedRoleName && member.roles.cache.some(r => r.name === config.allowedRoleName);
    const hasAllowedRoleId = config.allowedRoleId && member.roles.cache.some(r => r.id === config.allowedRoleId);
    const isOwner = guild.ownerId === member.id;

    return hasAllowedRole || hasAllowedRoleId || isOwner;
  } catch (error) {
    console.error('Error in verifyUser:', error);
    return false;
  }
};

/**
 * Responds to an interaction with a message
 * @param {Object} interaction - Discord interaction
 * @param {string} message - Message to send
 * @param {Error} error - Optional error object
 * @param {Object} client - Discord client
 * @param {Object} config - Bot configuration
 */
export const respondToInteraction = async (interaction, message, error = null, client, config) => {
  try {
    if (!interaction) {
      if (config.logChannelId) {
        const mainServer = await client.guilds.fetch(config.mainServer);
        const logChannel = await mainServer.channels.fetch(config.logChannelId);
        await logChannel.send(message);
      }
    } else {
      if (interaction.deferred) {
        await interaction.editReply({ content: message });
      } else if (interaction.replied) {
        await interaction.followUp({ content: message });
      } else {
        await interaction.reply({ content: message, ephemeral: true });
      }
    }

    if (error) {
      console.error('Error in command execution:', error);
      
      // Import dynamically to avoid circular dependency
      const { logToDiscord } = await import('./logging.js');
      await logToDiscord(
        client,
        message,
        'error',
        config,
        error
      );
    }
  } catch (err) {
    console.error('Error in respondToInteraction:', err);
  }
};
