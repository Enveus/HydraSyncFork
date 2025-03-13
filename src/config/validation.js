/**
 * Configuration validation functions
 */

import { colorLog } from '../utils/logging.js';

/**
 * Validates the configuration file and exits if there are errors
 * @param {Object} config - The configuration object
 */
export const verifyConfig = (config) => {
  console.log("\x1b[91mError \x1b[93mWarning \x1b[94mInfo\x1b[0m");

  let hasError = false;
  colorLog('info', 'VERIFYING CONFIG FILE');

  // Errors
  if (!config.applicationId) {
    hasError = true;
    colorLog('error', 'Config applicationId missing, please check.');
  }

  if (!config.token) {
    hasError = true;
    colorLog('error', 'Config token missing, please add it.');
  }

  if (!config.mainServer) {
    hasError = true;
    colorLog('error', 'Config mainserver missing, please check.');
  }

  if (!config.syncedServers || (config.syncedServers && !Array.isArray(config.syncedServers))) {
    hasError = true;
    colorLog('error', 'Config syncedServers missing or not Array, please verify it exists and matches structure "syncedServers": ["123456789123456789"]');
  }

  // Warnings
  if (!config.logChannelId) {
    colorLog('warning', 'logChannelId not found in config file, logs will not be sent.');
  }

  if (!config.allowedRoleName) {
    if (!config.allowedRoleId) {
      colorLog('warning', 'allowedRoleName and allowedRoleId not found in config file, only server owner can use commands.');
    }
    colorLog('warning', 'allowedRoleName not found in config file, only server owner can use commands or user with allowedRoleId.');
  }

  if (!config.allowedRoleId && config.allowedRoleName === undefined) {
    colorLog('warning', 'allowedRoleId not found in config file, only server owner can use commands or user with allowedRoleName.');
  }

  if (hasError) {
    colorLog('error', 'CONFIG FILE HAD ERROR, EXITING!');
    process.exit(1);
  } else {
    colorLog('info', 'FINISHED VERIFYING CONFIG FILE');
  }
};

/**
 * Verifies the bot is in all servers specified in the config
 * @param {Object} client - Discord client
 * @param {Object} config - Bot configuration
 */
export const verifyBotInServers = async (client, config) => {
  let hasError = false;
  colorLog('info', `VERIFYING BOT IS IN ALL SERVER ID's IN CONFIG FILE`);
  
  const guildsBotIsIn = await client.guilds.fetch();
  
  if (!guildsBotIsIn.findKey(guild => guild.id === config.mainServer)) {
    hasError = true;
    colorLog('error', `Bot is not in main server with id: ${config.mainServer} Please invite bot to server and restart bot.`);
  }
  
  for (const serverId of config.syncedServers) {
    if (!guildsBotIsIn.findKey(guild => guild.id === serverId)) {
      hasError = true;
      colorLog('error', `Bot is not in synced server ${serverId}: Please invite bot to server and restart bot.`);
    }
  }

  if (hasError) {
    colorLog('error', 'BOT NOT IN A SERVER, EXITING!');
    process.exit(1);
  } else {
    colorLog('info', 'FINISHED VERIFYING BOT IS IN ALL SERVERS FROM CONFIG FILE');
  }
};
