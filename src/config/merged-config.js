/**
 * Merged configuration module
 * Combines static config.json and dynamic ui-config.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from "module";

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Load configuration from config.json
let staticConfig;
try {
  staticConfig = require('../../config.json');
} catch (error) {
  console.error('\x1b[91mError loading config.json:\x1b[0m', error.message);
  console.error('\x1b[91mPlease make sure config.json exists and is valid JSON.\x1b[0m');
  console.error('\x1b[91mYou can copy config.example.json to config.json and fill in your values.\x1b[0m');
  process.exit(1);
}


// Path to ui-config.json
const UI_CONFIG_PATH = path.join(__dirname, '..', 'web', 'ui-config.json');

/**
 * Loads the UI configuration from ui-config.json
 * @returns {Object|null} UI configuration or null if not found
 */
export const loadUiConfig = () => {
    try {
        if (fs.existsSync(UI_CONFIG_PATH)) {
            const uiConfigData = fs.readFileSync(UI_CONFIG_PATH, 'utf8');
            return JSON.parse(uiConfigData);
        }
    } catch (error) {
        console.error('\x1b[93mWarning: Error loading ui-config.json:\x1b[0m', error.message);
        console.error('\x1b[93mFalling back to static configuration.\x1b[0m');
    }
    return null;
};

/**
 * Converts UI configuration format to bot's internal format
 * @param {Object} uiConfig - UI configuration
 * @returns {Object} Converted configuration
 */
export const convertUiConfigFormat = (uiConfig) => {
    if (!uiConfig) return {};

    const converted = {
        mainServer: {
            id: uiConfig.mainServer?.id,
            roles: []
        },
        syncedServers: []
    };

    // Convert main server roles
    if (uiConfig.mainServer?.roles) {
        converted.mainServer.roles = uiConfig.mainServer.roles.map(role => ({
            id: role.id,
            syncId: role.syncId
        }));
    }

    // Convert synced servers
    if (uiConfig.syncedServers) {
        converted.syncedServers = uiConfig.syncedServers.map(server => ({
            id: server.id,
            roles: server.roles?.map(role => {
                const convertedRole = {
                    id: role.id,
                    syncId: role.syncId
                };
                
                // Include syncIds array if available
                if (role.syncIds && role.syncIds.length > 0) {
                    convertedRole.syncIds = role.syncIds;
                }
                
                return convertedRole;
            }) || []
        }));
    }

    return converted;
};

/**
 * Merges static and UI configurations
 * @param {Object} staticConfig - Static configuration from config.json
 * @param {Object} uiConfig - UI configuration from ui-config.json
 * @returns {Object} Merged configuration
 */
export const mergeConfigurations = (staticConfig, uiConfig) => {
    if (!uiConfig) return staticConfig;

    const convertedUiConfig = convertUiConfigFormat(uiConfig);
    
    // Create a deep copy of the static config
    const mergedConfig = JSON.parse(JSON.stringify(staticConfig));
    
    // Add syncConfig property for Sync ID-based role linking
    mergedConfig.syncConfig = {
        mainServer: convertedUiConfig.mainServer,
        syncedServers: convertedUiConfig.syncedServers
    };
    
    // Override mode if specified in UI config
    if (uiConfig.mode) {
        mergedConfig.mode = uiConfig.mode === 'main-to-many' ? 'regular' : 'reverse';
    }
    
    return mergedConfig;
};

/**
 * Validates the UI configuration format
 * @param {Object} uiConfig - UI configuration
 * @returns {Object} Validation result with isValid and errors properties
 */
export const validateUiConfig = (uiConfig) => {
    const errors = [];
    
    if (!uiConfig) {
        errors.push('UI configuration is null or undefined');
        return { isValid: false, errors };
    }
    
    // Check mode
    if (uiConfig.mode && !['main-to-many', 'many-to-main'].includes(uiConfig.mode)) {
        errors.push(`Invalid mode: ${uiConfig.mode}. Must be 'main-to-many' or 'many-to-main'`);
    }
    
    // Check main server
    if (!uiConfig.mainServer) {
        errors.push('Main server is missing');
    } else if (!uiConfig.mainServer.id) {
        errors.push('Main server ID is missing');
    }
    
    // Check synced servers
    if (!uiConfig.syncedServers || !Array.isArray(uiConfig.syncedServers)) {
        errors.push('Synced servers must be an array');
    } else if (uiConfig.syncedServers.length === 0) {
        errors.push('At least one synced server is required');
    } else {
        uiConfig.syncedServers.forEach((server, index) => {
            if (!server.id) {
                errors.push(`Synced server at index ${index} is missing ID`);
            }
        });
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

// Load UI configuration
const uiConfig = loadUiConfig();

// Validate UI configuration
const validationResult = validateUiConfig(uiConfig);
if (uiConfig && !validationResult.isValid) {
    console.error('\x1b[93mWarning: Invalid UI configuration:\x1b[0m');
    validationResult.errors.forEach(error => console.error(`- ${error}`));
    console.error('\x1b[93mFalling back to static configuration.\x1b[0m');
}

// Create merged configuration
export const mergedConfig = uiConfig && validationResult.isValid 
    ? mergeConfigurations(staticConfig, uiConfig)
    : staticConfig;

// Add the original UI config for reference
mergedConfig.uiConfig = uiConfig;

// Export the merged configuration as the default
export default mergedConfig;
