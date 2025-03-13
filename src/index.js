/**
 * SyncBot - Main Entry Point
 * 
 * This is the main entry point for the SyncBot application.
 * It initializes the bot and sets up event handlers based on the specified mode.
 */

import { createClient } from './client.js';
import mergedConfig, { config, verifyConfig } from './config/index.js';
import { createRoleCache, debugLog, throttleUpdate } from './utils/index.js';
import { setupEventHandlers } from './events/index.js';
import { registerCommands } from './commands/index.js';
import { startUiWithClient } from './web/integration.js';

/**
 * Starts the bot in the specified mode
 * @param {boolean} isReverseMode - Whether to start in reverse mode
 * @param {boolean} registerCommandsOnly - Whether to only register commands and exit
 * @param {boolean} isGlobalRegistration - Whether to register commands globally
 * @param {Object} options - Additional options
 * @param {boolean} options.startUi - Whether to start the UI server
 * @param {number} options.uiPort - Port for the UI server
 * @param {boolean} options.openBrowser - Whether to open the browser
 */
export const startBot = async (isReverseMode = false, registerCommandsOnly = false, isGlobalRegistration = false, options = {}) => {
  // Determine mode from merged config if available
  if (mergedConfig.mode) {
    isReverseMode = mergedConfig.mode === 'reverse';
    console.log(`Using mode from configuration: ${isReverseMode ? 'reverse' : 'regular'}`);
  }

  // Validate configuration
  verifyConfig(mergedConfig);
  
  // If only registering commands, do that and exit
  if (registerCommandsOnly) {
    await registerCommands(isGlobalRegistration, isReverseMode);
    console.log('Command registration complete. Exiting...');
    return;
  }
  
  // Create Discord client
  const client = createClient(mergedConfig);
  
  // Attach the sync configuration to the client for easy access
  client.syncConfig = mergedConfig.syncConfig;
  
  // Set up state
  const state = {
    triggeredByIntention: false,
    isDebug: process.argv.includes('debug'),
    cache: createRoleCache()
  };
  
  // Set up event handlers
  setupEventHandlers(client, state, isReverseMode);
  
  // Login to Discord
  await client.login(mergedConfig.token);
  
  // Start UI server if requested
  if (options.startUi) {
    startUiWithClient(client, {
      port: options.uiPort || 3000,
      openBrowser: options.openBrowser || false
    });
  }

  return client;
};

// If this file is run directly, start the bot
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const isReverseMode = args.includes('reverse');
  const registerCommandsOnly = args.includes('register-only');
  const isGlobalRegistration = args.includes('global');
  const startUi = args.includes('ui');
  const uiPort = args.includes('ui-port') ? parseInt(args[args.indexOf('ui-port') + 1]) : 3000;
  const openBrowser = args.includes('open-browser');
  
  startBot(isReverseMode, registerCommandsOnly, isGlobalRegistration, {
    startUi,
    uiPort,
    openBrowser
  });
}
