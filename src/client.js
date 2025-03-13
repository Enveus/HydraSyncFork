/**
 * Discord client module
 */

import { Client, GatewayIntentBits } from "discord.js";
import { colorLog } from './utils/logging.js';

/**
 * Creates and initializes a Discord client with the required intents
 * @param {Object} config - Bot configuration
 * @returns {Client} Configured Discord client
 */
export const createClient = (config) => {
  const client = new Client({ 
    intents: [
      GatewayIntentBits.Guilds, 
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences
    ] 
  });

  // Store the configuration on the client for easy access
  client.syncConfig = config;
  
  // Log configuration source
  if (config.uiConfig) {
    colorLog('info', 'Using merged configuration from config.json and ui-config.json');
  } else {
    colorLog('info', 'Using configuration from config.json only');
  }

  return client;
};
