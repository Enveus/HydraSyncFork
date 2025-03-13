// Express server for HydraSync UI
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createApiRoutes } from './api/routes.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Discord client reference (will be set when the server is started with a client)
let discordClient = null;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// API Routes
// If Discord client is available, use real data, otherwise use mock data
app.use('/api', (req, res, next) => {
    if (discordClient) {
        // Use real API routes with Discord client
        createApiRoutes(discordClient)(req, res, next);
    } else {
        // Use mock API routes for development
        console.log('Using mock API routes (Discord client not available)');
        next();
    }
});

// Mock API routes for development (used when Discord client is not available)
app.get('/api/servers', (req, res) => {
    // Mock data for development
    const mockServers = [
        { id: 'server-1', name: 'Development Server' },
        { id: 'server-2', name: 'Gaming Community' },
        { id: 'server-3', name: 'Study Group' },
        { id: 'server-4', name: 'Project Team' },
        { id: 'server-5', name: 'Friend Group' }
    ];
    res.json(mockServers);
});

app.get('/api/servers/:serverId/roles', (req, res) => {
    const { serverId } = req.params;
    // Mock data for development
    const mockRoles = {
        'server-1': [
            { id: 'role-1-1', name: 'Admin', color: '#FF0000' },
            { id: 'role-1-2', name: 'Moderator', color: '#00FF00' },
            { id: 'role-1-3', name: 'Developer', color: '#0000FF' },
            { id: 'role-1-4', name: 'Tester', color: '#FFFF00' }
        ],
        'server-2': [
            { id: 'role-2-1', name: 'Owner', color: '#FF0000' },
            { id: 'role-2-2', name: 'Admin', color: '#FF00FF' },
            { id: 'role-2-3', name: 'Moderator', color: '#00FFFF' },
            { id: 'role-2-4', name: 'Member', color: '#FFFFFF' }
        ],
        'server-3': [
            { id: 'role-3-1', name: 'Teacher', color: '#FF0000' },
            { id: 'role-3-2', name: 'Student', color: '#00FF00' },
            { id: 'role-3-3', name: 'Guest', color: '#0000FF' }
        ],
        'server-4': [
            { id: 'role-4-1', name: 'Project Lead', color: '#FF0000' },
            { id: 'role-4-2', name: 'Developer', color: '#00FF00' },
            { id: 'role-4-3', name: 'Designer', color: '#0000FF' },
            { id: 'role-4-4', name: 'QA', color: '#FFFF00' }
        ],
        'server-5': [
            { id: 'role-5-1', name: 'Close Friend', color: '#FF0000' },
            { id: 'role-5-2', name: 'Friend', color: '#00FF00' },
            { id: 'role-5-3', name: 'Acquaintance', color: '#0000FF' }
        ]
    };
    const roles = mockRoles[serverId] || [];
    res.json(roles);
});

app.get('/api/config', (req, res) => {
    // Try to read from ui-config.json, or use mock data if not available
    try {
        if (fs.existsSync(path.join(__dirname, 'ui-config.json'))) {
            const uiConfigData = fs.readFileSync(path.join(__dirname, 'ui-config.json'), 'utf8');
            const uiConfig = JSON.parse(uiConfigData);
            res.json(uiConfig);
        } else {
            // Mock data for development
            const mockConfig = {
                id: 'config-123',
                mode: 'main-to-many',
                mainServer: {
                    id: 'server-1',
                    roles: [
                        { id: 'role-1-1', syncId: 1 },
                        { id: 'role-1-2', syncId: 2 }
                    ]
                },
                syncedServers: [
                    {
                        id: 'server-2',
                        roles: [
                            { id: 'role-2-1', syncId: 1 },
                            { id: 'role-2-2', syncId: 2 }
                        ]
                    },
                    {
                        id: 'server-3',
                        roles: [
                            { id: 'role-3-1', syncId: 1 },
                            { id: 'role-3-2', syncId: 2 }
                        ]
                    }
                ]
            };
            res.json(mockConfig);
        }
    } catch (error) {
        console.error('Error loading configuration:', error);
        res.status(500).json({
            error: 'Failed to load configuration',
            message: error.message
        });
    }
});

app.post('/api/config', (req, res) => {
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
    try {
        fs.writeFileSync(path.join(__dirname, 'ui-config.json'), JSON.stringify(updatedConfig, null, 2));
        console.log('Configuration saved to ui-config.json');
        
        // If Discord client is available, signal it to reload configuration
        if (discordClient) {
            console.log('Bot configuration update requested');
            // This will be implemented in a future update
        }
        
        res.json(updatedConfig);
    } catch (error) {
        console.error('Error saving configuration to file:', error);
        return res.status(500).json({ 
            error: 'Failed to save configuration to file',
            message: error.message
        });
    }
});

app.get('/api/status', (req, res) => {
    if (discordClient) {
        res.json({
            online: discordClient.isReady(),
            uptime: discordClient.uptime,
            serverCount: discordClient.guilds.cache.size,
            mode: discordClient.syncConfig?.mode || 'unknown'
        });
    } else {
        res.json({
            online: false,
            message: 'Discord client not available'
        });
    }
});

// Serve the main HTML file for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * Starts the UI server
 * @param {number} port - Port to listen on
 * @param {Object} client - Discord client (optional)
 * @returns {Object} Express app and server instance
 */
export const startServer = (port = PORT, client = null) => {
    // Set Discord client
    discordClient = client;
    
    // Log whether we're using real or mock data
    if (discordClient) {
        console.log('Using real Discord data for API endpoints');
    } else {
        console.log('Using mock data for API endpoints (Discord client not provided)');
    }
    
    // Start the server
    const server = app.listen(port, () => {
        console.log(`HydraSync UI server running on http://localhost:${port}`);
    });
    
    return { app, server };
};

// If this file is run directly, start the server
if (import.meta.url === `file://${process.argv[1]}`) {
    startServer();
}

export default app;
