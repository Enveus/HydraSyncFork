/**
 * API routes for the UI dashboard
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to ui-config.json
const UI_CONFIG_PATH = path.join(__dirname, '..', 'ui-config.json');

/**
 * Creates API routes for the UI dashboard
 * @param {Object} client - Discord client
 * @returns {express.Router} Express router with API routes
 */
export const createApiRoutes = (client) => {
    const router = express.Router();

    /**
     * GET /api/servers
     * Returns a list of servers the bot has access to
     */
    router.get('/servers', async (req, res) => {
        try {
            // Check if client is available
            if (!client) {
                return res.status(503).json({
                    error: 'Discord client not available'
                });
            }

            // Get all guilds the bot is a member of
            const guilds = client.guilds.cache.map(guild => ({
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL(),
                banner: guild.bannerURL(),
                memberCount: guild.memberCount
            }));

            res.json(guilds);
        } catch (error) {
            console.error('Error fetching servers:', error);
            res.status(500).json({
                error: 'Failed to fetch servers',
                message: error.message
            });
        }
    });

    /**
     * GET /api/servers/:serverId/roles
     * Returns a list of roles for a specific server
     */
    router.get('/servers/:serverId/roles', async (req, res) => {
        try {
            const { serverId } = req.params;

            // Check if client is available
            if (!client) {
                return res.status(503).json({
                    error: 'Discord client not available'
                });
            }

            // Get the guild
            const guild = client.guilds.cache.get(serverId);
            if (!guild) {
                return res.status(404).json({
                    error: 'Server not found'
                });
            }

            // Get all roles for the guild
            const roles = guild.roles.cache
                .filter(role => role.name !== '@everyone') // Filter out @everyone role
                .map(role => {
                    const roleData = {
                        id: role.id,
                        name: role.name,
                        color: role.hexColor,
                        position: role.position,
                        permissions: role.permissions.toArray(),
                        // Add syncId if available in the configuration
                        syncId: getSyncIdForRole(role.id, serverId, client)
                    };
                    
                    // Add syncIds array for synced server roles
                    if (serverId !== client.syncConfig?.mainServer?.id) {
                        const syncIds = getSyncIdsForRole(role.id, serverId, client);
                        if (syncIds && syncIds.length > 0) {
                            roleData.syncIds = syncIds;
                        }
                    }
                    
                    return roleData;
                })
                .sort((a, b) => b.position - a.position); // Sort by position (highest first)

            res.json(roles);
        } catch (error) {
            console.error(`Error fetching roles for server ${req.params.serverId}:`, error);
            res.status(500).json({
                error: 'Failed to fetch roles',
                message: error.message
            });
        }
    });

    /**
     * GET /api/config
     * Returns the current UI configuration
     */
    router.get('/config', (req, res) => {
        try {
            // Check if ui-config.json exists
            if (fs.existsSync(UI_CONFIG_PATH)) {
                const uiConfigData = fs.readFileSync(UI_CONFIG_PATH, 'utf8');
                const uiConfig = JSON.parse(uiConfigData);
                res.json(uiConfig);
            } else {
                // Return default configuration if file doesn't exist
                res.json({
                    mode: 'main-to-many',
                    mainServer: null,
                    syncedServers: []
                });
            }
        } catch (error) {
            console.error('Error loading configuration:', error);
            res.status(500).json({
                error: 'Failed to load configuration',
                message: error.message
            });
        }
    });

    /**
     * POST /api/config
     * Saves the UI configuration
     */
    router.post('/config', async (req, res) => {
        try {
            const newConfig = req.body;
            
            // Validate config
            if (!newConfig.mainServer || !newConfig.syncedServers) {
                return res.status(400).json({ error: 'Invalid configuration' });
            }
            
            // Update config
            const updatedConfig = {
                ...newConfig,
                id: 'config-' + Date.now()
            };
            
            // Save configuration to a file
            fs.writeFileSync(UI_CONFIG_PATH, JSON.stringify(updatedConfig, null, 2));
            console.log('Configuration saved to ui-config.json');
            
            // If client is available, update its configuration
            if (client) {
                try {
                    // Import the configuration module
                    const { mergeConfigurations, validateUiConfig } = await import('../../config/merged-config.js');
                    const { createRequire } = await import('module');
                    const require = createRequire(import.meta.url);
                    
                    // Load the static config
                    const staticConfig = require('../../../config.json');
                    
                    // Validate the new UI config
                    const validationResult = validateUiConfig(updatedConfig);
                    if (validationResult.isValid) {
                        // Merge the configurations
                        const newMergedConfig = mergeConfigurations(staticConfig, updatedConfig);
                        
                        // Update the client's configuration
                        client.syncConfig = newMergedConfig.syncConfig;
                        
                        console.log('Bot configuration updated in memory');
                    } else {
                        console.error('Invalid UI configuration, not updating bot configuration');
                        validationResult.errors.forEach(error => console.error(`- ${error}`));
                    }
                } catch (configError) {
                    console.error('Error updating bot configuration:', configError);
                }
            }
            
            res.json(updatedConfig);
        } catch (error) {
            console.error('Error saving configuration:', error);
            res.status(500).json({
                error: 'Failed to save configuration',
                message: error.message
            });
        }
    });

    /**
     * GET /api/status
     * Returns the current status of the bot
     */
    router.get('/status', (req, res) => {
        try {
            // Check if client is available
            if (!client) {
                return res.status(503).json({
                    error: 'Discord client not available'
                });
            }

            const status = {
                online: client.isReady(),
                uptime: client.uptime,
                serverCount: client.guilds.cache.size,
                mode: client.syncConfig?.mode || 'unknown'
            };

            res.json(status);
        } catch (error) {
            console.error('Error fetching status:', error);
            res.status(500).json({
                error: 'Failed to fetch status',
                message: error.message
            });
        }
    });

    return router;
};

/**
 * Gets the Sync ID for a role from the client's configuration
 * @param {string} roleId - Role ID
 * @param {string} serverId - Server ID
 * @param {Object} client - Discord client
 * @returns {number|null} Sync ID or null if not found
 */
function getSyncIdForRole(roleId, serverId, client) {
    if (!client || !client.syncConfig) return null;

    // Check if this is the main server
    if (serverId === client.syncConfig.mainServer?.id) {
        const role = client.syncConfig.mainServer.roles?.find(r => r.id === roleId);
        return role?.syncId || null;
    }

    // Check synced servers
    const server = client.syncConfig.syncedServers?.find(s => s.id === serverId);
    if (server) {
        const role = server.roles?.find(r => r.id === roleId);
        return role?.syncId || null;
    }

    return null;
}

/**
 * Gets all Sync IDs for a role from the client's configuration
 * @param {string} roleId - Role ID
 * @param {string} serverId - Server ID
 * @param {Object} client - Discord client
 * @returns {Array<number>|null} Array of Sync IDs or null if not found
 */
function getSyncIdsForRole(roleId, serverId, client) {
    if (!client || !client.syncConfig) return null;

    // Check if this is the main server
    if (serverId === client.syncConfig.mainServer?.id) {
        const role = client.syncConfig.mainServer.roles?.find(r => r.id === roleId);
        // Main server roles only have a single syncId
        return role?.syncId ? [role.syncId] : null;
    }

    // Check synced servers
    const server = client.syncConfig.syncedServers?.find(s => s.id === serverId);
    if (server) {
        const role = server.roles?.find(r => r.id === roleId);
        if (role) {
            // If syncIds array exists, return it
            if (role.syncIds && role.syncIds.length > 0) {
                return role.syncIds;
            }
            // Otherwise, return an array with just syncId if it exists
            else if (role.syncId) {
                return [role.syncId];
            }
        }
    }

    return null;
}
