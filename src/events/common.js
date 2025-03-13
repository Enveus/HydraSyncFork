/**
 * Common event handlers for both modes
 */

import { config, verifyBotInServers } from '../config/index.js';
import { handleCommandInteraction } from '../commands/index.js';
import { roleCheckerRegular } from '../commands/role-checker.js';
import { roleCheckerReverse } from '../commands/role-checker.js';

/**
 * Sets up common event handlers for both modes
 * @param {Object} client - Discord client
 * @param {Object} state - Bot state
 * @param {boolean} isReverseMode - Whether the bot is in reverse mode
 */
export const setupCommonEvents = (client, state, isReverseMode) => {
  // Bot ready event
  client.on('ready', async () => {
    await verifyBotInServers(client, config);
    console.log(`SyncBot ready in ${isReverseMode ? 'reverse' : 'regular'} mode!`);
    console.log(`Debug mode set to ${state.isDebug}`);
  });

  // Command interaction handler
  client.on('interactionCreate', async interaction => {
    // Choose the appropriate role checker function based on mode
    const roleCheckerFn = isReverseMode 
      ? (interaction, forceSync) => roleCheckerReverse(interaction, forceSync, client, state)
      : (interaction, forceSync) => roleCheckerRegular(interaction, forceSync, client, state);
    
    // Handle the command interaction
    await handleCommandInteraction(interaction, client, state, isReverseMode, roleCheckerFn);
  });
};
