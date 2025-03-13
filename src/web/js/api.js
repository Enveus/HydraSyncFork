// API module for HydraSync UI
// This module handles all communication with the Discord bot backend

// Base API URL - this would be replaced with the actual API endpoint
const API_BASE_URL = '/api';

/**
 * Fetch all servers that the bot has access to
 * @returns {Promise<Array>} Array of server objects
 */
export async function fetchServers() {
    try {
        const response = await fetch(`${API_BASE_URL}/servers`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching servers:', error);
        throw new Error('Failed to fetch servers');
    }
}

/**
 * Fetch all roles for a specific server
 * @param {string} serverId The ID of the server
 * @returns {Promise<Array>} Array of role objects
 */
export async function fetchRoles(serverId) {
    try {
        const response = await fetch(`${API_BASE_URL}/servers/${serverId}/roles`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching roles for server ${serverId}:`, error);
        throw new Error('Failed to fetch roles');
    }
}

/**
 * Save the configuration to the backend
 * @param {Object} config The configuration object
 * @returns {Promise<Object>} The saved configuration
 */
export async function saveConfiguration(config) {
    try {
        const response = await fetch(`${API_BASE_URL}/config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(config),
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error saving configuration:', error);
        throw new Error('Failed to save configuration');
    }
}

/**
 * Load the current configuration from the backend
 * @returns {Promise<Object>} The current configuration
 */
export async function loadConfiguration() {
    try {
        const response = await fetch(`${API_BASE_URL}/config`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error loading configuration:', error);
        throw new Error('Failed to load configuration');
    }
}

// Mock data functions for development
function mockServers() {
    return [
        { id: 'server-1', name: 'Development Server' },
        { id: 'server-2', name: 'Gaming Community' },
        { id: 'server-3', name: 'Study Group' },
        { id: 'server-4', name: 'Project Team' },
        { id: 'server-5', name: 'Friend Group' }
    ];
}

function mockRoles(serverId) {
    const roles = {
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
    
    return roles[serverId] || [];
}

function mockConfiguration() {
    return {
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
}

// Export additional functions for testing
export const _mock = {
    mockServers,
    mockRoles,
    mockConfiguration
};
