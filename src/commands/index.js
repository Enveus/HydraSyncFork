/**
 * Command registration and handling module
 */

import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { PermissionFlagsBits } from "discord-api-types/v10";
import { config } from '../config/index.js';
import { verifyUser } from '../utils/index.js';
import { handleAddRoleInteraction } from './add.js';
import { handleRemoveRoleInteraction } from './remove.js';

// Command definitions
export const commands = [
  {
    name: 'add',
    description: 'Will add the role to the user in both servers.',
    default_member_permissions: getDefaultPermissions(),
    options: [
      {
        "name": "role",
        "description": "The role to add in both servers",
        "type": 8,
        "required": true
      },
      {
        "name": "user",
        "description": "The user to add the role to in both servers",
        "type": 6,
        "required": true
      }
    ]
  },
  {
    name: 'remove',
    description: 'Will remove the role from the user in both servers.',
    default_member_permissions: getDefaultPermissions(),
    options: [
      {
        "name": "role",
        "description": "The role to remove in both servers",
        "type": 8,
        "required": true
      },
      {
        "name": "user",
        "description": "The user to remove the role to in both servers",
        "type": 6,
        "required": true
      }
    ]
  },
  {
    "name": "role-checker",
    "type": 1,
    "description": "A role checker to compare roles between the main server and synced servers.",
    "default_member_permissions": getDefaultPermissions(),
    "options": [
      {
        "name": "option",
        "description": "Analyze sends a DM with the differences, force-sync will apply the changes shown in the analysis",
        "type": 3,
        "required": true,
        "choices": [
          {
            "name": "analyze",
            "value": "analyze"
          },
          {
            "name": "force-sync",
            "value": "force"
          }
        ]
      }
    ]
  }
];

/**
 * Helper function to get default permissions
 * @param {boolean} isReverseMode - Whether the bot is in reverse mode
 * @returns {string} Default permissions string
 */
function getDefaultPermissions(isReverseMode = false) {
  // For regular mode, check allowedRoleId
  // For reverse mode, check allowedRoleName
  const configKey = isReverseMode ? 'allowedRoleName' : 'allowedRoleId';
  
  // If the relevant config key is not set, default to server administrators only
  return config[configKey] ? "0" : PermissionFlagsBits.Administrator.toString();
}

/**
 * Registers commands with Discord API
 * @param {boolean} isGlobal - Whether to register commands globally
 * @param {boolean} isReverseMode - Whether the bot is in reverse mode
 */
export const registerCommands = async (isGlobal = false, isReverseMode = false) => {
  try {
    console.log('Started refreshing application (/) commands.');
    
    const rest = new REST({ version: '9' }).setToken(config.token);
    
    if (isGlobal) {
      // Register commands globally
      await rest.put(
        Routes.applicationCommands(config.applicationId),
        { body: commands },
      );
      console.log('Successfully registered application commands globally.');
    } else {
      // Register commands for the main server only
      await rest.put(
        Routes.applicationGuildCommands(config.applicationId, config.mainServer),
        { body: commands },
      );
      console.log(`Successfully registered application commands for main server (${config.mainServer}).`);
    }
  } catch (error) {
    console.error('Error registering commands:', error);
  }
};

/**
 * Handles command interactions
 * @param {Object} interaction - Discord interaction
 * @param {Object} client - Discord client
 * @param {Object} state - Bot state
 * @param {boolean} isReverseMode - Whether the bot is in reverse mode
 * @param {Function} roleCheckerFn - Role checker function
 */
export const handleCommandInteraction = async (interaction, client, state, isReverseMode, roleCheckerFn) => {
  // Only handle application commands
  if (!interaction.isChatInputCommand()) return;
  
  // Commands must be sent from a guild/server
  if (!interaction.guildId) {
    return interaction.reply({content: 'This command must be sent from a guild/server.', ephemeral: true});
  }

  try {
    // Check if user has the allowed role (for backward compatibility)
    if (config.allowedRoleId || config.allowedRoleName) {
      const verified = await verifyUser(client, interaction.member.id, config);
      if (!verified) {
        return interaction.reply({
          content: `You don't have the necessary role to use this command.`,
          ephemeral: true
        });
      }
    }
    
    await interaction.deferReply();
    state.triggeredByIntention = true;

    if (interaction.commandName === 'add') {
      await handleAddRoleInteraction(
        interaction, 
        interaction.options.getMember('user'), 
        interaction.options.getRole('role').id,
        client,
        state,
        isReverseMode
      );
    } 
    
    else if (interaction.commandName === 'remove') {
      await handleRemoveRoleInteraction(
        interaction, 
        interaction.options.getMember('user'), 
        interaction.options.getRole('role').id,
        client,
        state,
        isReverseMode
      );
    } 
    
    else if (interaction.commandName === 'role-checker') {
      // Role-checker must be run from the main server in regular mode
      if (!isReverseMode && interaction.guildId !== config.mainServer) {
        return interaction.editReply({
          content: `You need to run this command in your main server.`,
          ephemeral: true
        });
      }
      
      let option = interaction.options.getString('option');
      const forceSync = option === 'force';
      
      await roleCheckerFn(interaction, forceSync);
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: 'An error occurred while processing your command.',
        ephemeral: true
      });
    } else if (interaction.replied) {
      await interaction.followUp({
        content: 'An error occurred while processing your command.',
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: 'An error occurred while processing your command.',
        ephemeral: true
      });
    }
  }
};
