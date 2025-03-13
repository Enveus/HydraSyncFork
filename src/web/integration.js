/**
 * Integration module for connecting the UI server with the Discord bot
 */

import { startServer } from './server.js';

/**
 * Starts the UI server with the Discord client
 * @param {Object} client - Discord client
 * @param {Object} options - Server options
 * @param {number} options.port - Port to listen on (default: 3000)
 * @param {boolean} options.openBrowser - Whether to open the browser (default: false)
 * @returns {Object} Server instance
 */
export const startUiWithClient = (client, options = {}) => {
    const { port = 3000, openBrowser = false } = options;
    
    // Start the server with the Discord client
    console.log(`Starting UI server with Discord client integration on port ${port}...`);
    const { server } = startServer(port, client);
    
    // Open browser if requested
    if (openBrowser) {
        const { exec } = require('child_process');
        const url = `http://localhost:${port}`;
        let command;
        
        switch (process.platform) {
            case 'darwin': // macOS
                command = `open ${url}`;
                break;
            case 'win32': // Windows
                command = `start ${url}`;
                break;
            default: // Linux and others
                command = `xdg-open ${url}`;
                break;
        }
        
        exec(command, (error) => {
            if (error) {
                console.error(`Failed to open browser: ${error}`);
                console.log(`Please open ${url} in your browser manually.`);
            }
        });
    }
    
    return server;
};

/**
 * Reloads the bot configuration from the UI configuration
 * @param {Object} client - Discord client
 * @returns {Promise<boolean>} Whether the reload was successful
 */
export const reloadBotConfiguration = async (client) => {
    try {
        if (!client) {
            console.error('Cannot reload configuration: Discord client not available');
            return false;
        }
        
        // Import the merged-config module
        const { loadUiConfig, validateUiConfig, convertUiConfigFormat, mergeConfigurations } = await import('../config/merged-config.js');
        
        // Load the UI configuration
        const uiConfig = loadUiConfig();
        
        // Validate the UI configuration
        const validationResult = validateUiConfig(uiConfig);
        if (!validationResult.isValid) {
            console.error('Invalid UI configuration:');
            validationResult.errors.forEach(error => console.error(`- ${error}`));
            return false;
        }
        
        // Get the current static configuration
        const { config: staticConfig } = await import('../config/index.js');
        
        // Merge the configurations
        const mergedConfig = mergeConfigurations(staticConfig, uiConfig);
        
        // Update the client's configuration
        client.syncConfig = mergedConfig;
        
        console.log('Bot configuration reloaded from UI configuration');
        return true;
    } catch (error) {
        console.error('Error reloading bot configuration:', error);
        return false;
    }
};

/**
 * Registers a configuration update handler
 * @param {Object} client - Discord client
 * @param {Function} callback - Callback function to call when configuration is updated
 */
export const registerConfigUpdateHandler = (client, callback) => {
    // This is a placeholder for future implementation
    // In a real implementation, this would register a handler for configuration updates
    // For example, using WebSockets or a message queue
    console.log('Configuration update handler registered');
};

export default {
    startUiWithClient,
    reloadBotConfiguration,
    registerConfigUpdateHandler
};
