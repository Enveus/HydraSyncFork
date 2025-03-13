// Main application script for HydraSync UI
import { fetchServers, fetchRoles, saveConfiguration, loadConfiguration } from './api.js';

// DOM Elements
const syncModeSelect = document.getElementById('sync-mode');
const addMainServerBtn = document.getElementById('add-main-server');
const addSyncedServerBtn = document.getElementById('add-synced-server');
const saveConfigBtn = document.getElementById('save-config');
const removeMainServerBtn = document.getElementById('remove-main-server');
const serverModal = document.getElementById('server-modal');
const roleModal = document.getElementById('role-modal');
const syncIdModal = document.getElementById('sync-id-modal');
const serverList = document.getElementById('server-list');
const roleList = document.getElementById('role-list');
const syncIdSelect = document.getElementById('sync-id-select');
const saveSyncIdBtn = document.getElementById('save-sync-id');
const cancelSyncIdBtn = document.getElementById('cancel-sync-id');
const syncedServersContainer = document.getElementById('synced-servers');
const mainServerRolesList = document.getElementById('main-server-roles');

// State
let currentState = {
    mode: 'main-to-many', // or 'many-to-main'
    mainServer: null,
    syncedServers: [],
    currentAction: null, // 'add-main', 'add-synced', 'add-role-main', 'add-role-synced'
    currentServerIndex: null, // Used when adding roles to a specific synced server
    currentRole: null, // Used when setting a Sync ID for a role
    currentRoleIndex: null, // Used when setting a Sync ID for a role
    currentRoleType: null, // 'main' or 'synced'
};

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeApp);
syncModeSelect.addEventListener('change', handleModeChange);
addMainServerBtn.addEventListener('click', () => openServerModal('add-main'));
addSyncedServerBtn.addEventListener('click', () => openServerModal('add-synced'));
saveConfigBtn.addEventListener('click', handleSaveConfig);
saveSyncIdBtn.addEventListener('click', handleSaveSyncId);
cancelSyncIdBtn.addEventListener('click', () => syncIdModal.style.display = 'none');
// The remove main server button is added dynamically, so we'll handle it in handleDelegatedEvents

// Close modals when clicking the X or outside the modal
document.querySelectorAll('.close-modal').forEach(closeBtn => {
    closeBtn.addEventListener('click', closeAllModals);
});

window.addEventListener('click', (event) => {
    if (event.target === serverModal || event.target === roleModal || event.target === syncIdModal) {
        closeAllModals();
    }
});

// Populate Sync ID dropdown options (1-50)
for (let i = 1; i <= 50; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i;
    syncIdSelect.appendChild(option);
}

// Populate Sync ID checkboxes (1-50)
const checkboxesContainer = document.querySelector('.sync-id-checkboxes');
for (let i = 1; i <= 50; i++) {
    const checkboxDiv = document.createElement('div');
    checkboxDiv.className = 'sync-id-checkbox';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `sync-id-checkbox-${i}`;
    checkbox.value = i;
    
    const label = document.createElement('label');
    label.htmlFor = `sync-id-checkbox-${i}`;
    label.textContent = i;
    
    checkboxDiv.appendChild(checkbox);
    checkboxDiv.appendChild(label);
    checkboxesContainer.appendChild(checkboxDiv);
}

// Initialize the application
async function initializeApp() {
    try {
        // Load saved configuration if available
        const config = await loadConfiguration();
        
        // Update state with loaded configuration
        currentState.mode = config.mode || 'main-to-many';
        syncModeSelect.value = currentState.mode;
        
        // Set main server if available
        if (config.mainServer && config.mainServer.id) {
            const mainServerDetails = await fetchServers()
                .then(servers => servers.find(s => s.id === config.mainServer.id));
            
            if (mainServerDetails) {
                currentState.mainServer = {
                    ...mainServerDetails,
                    roles: []
                };
                
                // Load roles for main server
                if (config.mainServer.roles && config.mainServer.roles.length > 0) {
                    const roles = await fetchRoles(config.mainServer.id);
                    currentState.mainServer.roles = roles.filter(role => 
                        config.mainServer.roles.some(configRole => configRole.id === role.id)
                    ).map(role => {
                        // Find the matching role in the config to get the syncId
                        const configRole = config.mainServer.roles.find(cr => cr.id === role.id);
                        return {
                            ...role,
                            syncId: configRole?.syncId || null
                        };
                    });
                }
                
                updateMainServerUI();
            }
        }
        
        // Set synced servers if available
        if (config.syncedServers && config.syncedServers.length > 0) {
            const allServers = await fetchServers();
            
            for (const syncedServer of config.syncedServers) {
                const serverDetails = allServers.find(s => s.id === syncedServer.id);
                
                if (serverDetails) {
                    const newServer = {
                        ...serverDetails,
                        roles: []
                    };
                    
                    // Load roles for synced server
                    if (syncedServer.roles && syncedServer.roles.length > 0) {
                        const roles = await fetchRoles(syncedServer.id);
                        newServer.roles = roles.filter(role => 
                            syncedServer.roles.some(configRole => configRole.id === role.id)
                        ).map(role => {
                            // Find the matching role in the config to get the syncId
                            const configRole = syncedServer.roles.find(cr => cr.id === role.id);
                            return {
                                ...role,
                                syncId: configRole?.syncId || null
                            };
                        });
                    }
                    
                    currentState.syncedServers.push(newServer);
                }
            }
            
            updateSyncedServersUI();
        }
    } catch (error) {
        console.error('Error initializing application:', error);
        // Continue with default state if loading fails
    }
    
    // Set initial mode
    updateDirectionArrow();
    
    // Add event delegation for dynamic elements
    document.addEventListener('click', handleDelegatedEvents);
}

// Handle mode change
function handleModeChange() {
    currentState.mode = syncModeSelect.value;
    updateDirectionArrow();
}

// Update the direction arrow based on the selected mode
function updateDirectionArrow() {
    const directionArrow = document.querySelector('.direction-arrow i');
    if (currentState.mode === 'main-to-many') {
        directionArrow.className = 'fas fa-arrow-right';
    } else {
        directionArrow.className = 'fas fa-arrow-left';
    }
}

// Open the server selection modal
function openServerModal(action) {
    currentState.currentAction = action;
    serverModal.style.display = 'flex';
    
    // Populate server list
    populateServerList();
}

// Open the role selection modal
function openRoleModal(action, serverIndex = null) {
    currentState.currentAction = action;
    currentState.currentServerIndex = serverIndex;
    roleModal.style.display = 'flex';
    
    // Populate role list based on the server
    populateRoleList(serverIndex);
}

// Close all modals
function closeAllModals() {
    serverModal.style.display = 'none';
    roleModal.style.display = 'none';
    syncIdModal.style.display = 'none';
}

// Populate the server list in the modal
async function populateServerList() {
    try {
        serverList.innerHTML = '<li>Loading servers...</li>';
        
        // Fetch servers from the API
        const servers = await fetchServers();
        
        if (servers.length === 0) {
            serverList.innerHTML = '<li>No servers available</li>';
            return;
        }
        
        // Create server list items
        serverList.innerHTML = '';
        servers.forEach(server => {
            const li = document.createElement('li');
            li.textContent = server.name;
            li.dataset.serverId = server.id;
            li.addEventListener('click', () => handleServerSelect(server));
            serverList.appendChild(li);
        });
    } catch (error) {
        console.error('Error fetching servers:', error);
        serverList.innerHTML = '<li>Error loading servers</li>';
    }
}

// Populate the role list in the modal
async function populateRoleList(serverIndex) {
    try {
        roleList.innerHTML = '<li>Loading roles...</li>';
        
        // Determine which server to fetch roles for
        let serverId;
        if (currentState.currentAction === 'add-role-main') {
            serverId = currentState.mainServer.id;
        } else {
            serverId = currentState.syncedServers[serverIndex].id;
        }
        
        // Fetch roles from the API
        const roles = await fetchRoles(serverId);
        
        if (roles.length === 0) {
            roleList.innerHTML = '<li>No roles available</li>';
            return;
        }
        
        // Create role list items
        roleList.innerHTML = '';
        roles.forEach(role => {
            const li = document.createElement('li');
            li.textContent = role.name;
            li.dataset.roleId = role.id;
            li.style.color = role.color || 'white';
            li.addEventListener('click', () => handleRoleSelect(role));
            roleList.appendChild(li);
        });
    } catch (error) {
        console.error('Error fetching roles:', error);
        roleList.innerHTML = '<li>Error loading roles</li>';
    }
}

// Handle server selection from the modal
function handleServerSelect(server) {
    if (currentState.currentAction === 'add-main') {
        // Set main server
        currentState.mainServer = {
            ...server,
            roles: []
        };
        updateMainServerUI();
    } else if (currentState.currentAction === 'add-synced') {
        // Add synced server
        currentState.syncedServers.push({
            ...server,
            roles: []
        });
        updateSyncedServersUI();
    }
    
    closeAllModals();
}

// Handle role selection from the modal
function handleRoleSelect(role) {
    if (currentState.currentAction === 'add-role-main') {
        // Add role to main server
        if (!currentState.mainServer.roles) {
            currentState.mainServer.roles = [];
        }
        // Add syncId property with default value of null
        role.syncId = null;
        currentState.mainServer.roles.push(role);
        updateMainServerRolesUI();
    } else if (currentState.currentAction === 'add-role-synced') {
        // Add role to synced server
        const serverIndex = currentState.currentServerIndex;
        // Add syncId property with default value of null
        role.syncId = null;
        currentState.syncedServers[serverIndex].roles.push(role);
        updateSyncedServerRolesUI(serverIndex);
    }
    
    closeAllModals();
}

// Update the main server UI
function updateMainServerUI() {
    if (!currentState.mainServer) return;
    
    const mainServerCard = document.querySelector('.main-server');
    const serverSelector = mainServerCard.querySelector('.server-selector');
    const serverDetails = mainServerCard.querySelector('.server-details');
    const serverName = mainServerCard.querySelector('#main-server-name');
    
    // Hide selector, show details
    serverSelector.style.display = 'none';
    serverDetails.style.display = 'block';
    
    // Update server name
    serverName.textContent = currentState.mainServer.name;
    
    // Add server banner if available
    if (currentState.mainServer.banner) {
        // Remove existing banner if any
        const existingBanner = mainServerCard.querySelector('.server-banner');
        if (existingBanner) {
            existingBanner.remove();
        }
        
        // Create and add new banner
        const bannerDiv = document.createElement('div');
        bannerDiv.className = 'server-banner';
        bannerDiv.style.backgroundImage = `url(${currentState.mainServer.banner})`;
        mainServerCard.insertBefore(bannerDiv, mainServerCard.firstChild);
    }
    
    // Add server avatar if available
    if (currentState.mainServer.icon) {
        // Remove existing avatar if any
        const existingAvatar = mainServerCard.querySelector('.server-avatar');
        if (existingAvatar) {
            existingAvatar.remove();
        }
        
        // Create and add new avatar
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'server-avatar';
        avatarDiv.style.backgroundImage = `url(${currentState.mainServer.icon})`;
        mainServerCard.insertBefore(avatarDiv, mainServerCard.firstChild);
    }
    
    // Initialize roles array if it doesn't exist
    if (!currentState.mainServer.roles) {
        currentState.mainServer.roles = [];
    }
    
    // Update roles list
    updateMainServerRolesUI();
}

// Open the Sync ID selection modal
function openSyncIdModal(roleType, serverIndex, roleIndex) {
    currentState.currentRoleType = roleType;
    currentState.currentServerIndex = serverIndex;
    currentState.currentRoleIndex = roleIndex;
    
    // Get the current role
    let role;
    if (roleType === 'main') {
        role = currentState.mainServer.roles[roleIndex];
    } else {
        role = currentState.syncedServers[serverIndex].roles[roleIndex];
    }
    
    currentState.currentRole = role;
    
    const singleSelector = document.getElementById('single-sync-id-selector');
    const multipleSelector = document.getElementById('multiple-sync-id-selector');
    const description = document.getElementById('sync-id-description');
    
    // Show appropriate selector based on role type
    if (roleType === 'main') {
        // Main server roles can only have one Sync ID
        singleSelector.style.display = 'block';
        multipleSelector.style.display = 'none';
        description.textContent = 'Select a Sync ID for this role. Roles with the same Sync ID will be linked across servers.';
        
        // Set the current Sync ID in the dropdown
        syncIdSelect.value = role.syncId || '';
    } else {
        // Synced server roles can have multiple Sync IDs
        singleSelector.style.display = 'none';
        multipleSelector.style.display = 'block';
        description.textContent = 'Select multiple Sync IDs for this role. This role will be linked to all roles with these Sync IDs in the main server.';
        
        // Reset all checkboxes
        document.querySelectorAll('.sync-id-checkbox input').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Check the appropriate checkboxes
        const syncIds = Array.isArray(role.syncIds) ? role.syncIds : (role.syncId ? [role.syncId] : []);
        syncIds.forEach(id => {
            const checkbox = document.getElementById(`sync-id-checkbox-${id}`);
            if (checkbox) checkbox.checked = true;
        });
    }
    
    // Show the modal
    syncIdModal.style.display = 'flex';
}

// Handle saving the Sync ID
function handleSaveSyncId() {
    if (currentState.currentRoleType === 'main') {
        // For main server roles, use the dropdown value
        const syncId = syncIdSelect.value ? parseInt(syncIdSelect.value) : null;
        currentState.mainServer.roles[currentState.currentRoleIndex].syncId = syncId;
        updateMainServerRolesUI();
    } else {
        // For synced server roles, collect all checked checkboxes
        const syncIds = [];
        document.querySelectorAll('.sync-id-checkbox input:checked').forEach(checkbox => {
            syncIds.push(parseInt(checkbox.value));
        });
        
        // Update the role with the array of Sync IDs
        const role = currentState.syncedServers[currentState.currentServerIndex].roles[currentState.currentRoleIndex];
        role.syncIds = syncIds.length > 0 ? syncIds : null;
        
        // For backward compatibility, also set syncId to the first ID or null
        role.syncId = syncIds.length > 0 ? syncIds[0] : null;
        
        updateSyncedServerRolesUI(currentState.currentServerIndex);
    }
    
    // Close the modal
    syncIdModal.style.display = 'none';
}

// Update the main server roles UI
function updateMainServerRolesUI() {
    if (!currentState.mainServer || !currentState.mainServer.roles) return;
    
    mainServerRolesList.innerHTML = '';
    
    currentState.mainServer.roles.forEach((role, index) => {
        const li = document.createElement('li');
        
        // Create Sync ID badge
        const syncIdBadge = role.syncId 
            ? `<span class="sync-id-badge" data-type="main" data-index="${index}">ID: ${role.syncId}</span>`
            : `<span class="sync-id-badge empty" data-type="main" data-index="${index}">Set ID</span>`;
        
        li.innerHTML = `
            <span style="color: ${role.color || 'white'}">${role.name} ${syncIdBadge}</span>
            <span class="remove-role" data-type="main" data-index="${index}">
                <i class="fas fa-times"></i>
            </span>
        `;
        mainServerRolesList.appendChild(li);
    });
}

// Update the synced servers UI
function updateSyncedServersUI() {
    // Clear existing synced servers (except the template)
    const template = document.querySelector('.synced-server-template');
    syncedServersContainer.innerHTML = '';
    syncedServersContainer.appendChild(template);
    
    // Add each synced server
    currentState.syncedServers.forEach((server, index) => {
        const serverCard = template.cloneNode(true);
        serverCard.classList.remove('synced-server-template');
        serverCard.style.display = 'block';
        
        // Set server name
        const serverName = serverCard.querySelector('.synced-server-name');
        serverName.textContent = server.name;
        
        // Set data attributes for identifying this server
        serverCard.dataset.serverIndex = index;
        
        // Show server details, hide selector
        const serverSelector = serverCard.querySelector('.server-selector');
        const serverDetails = serverCard.querySelector('.server-details');
        serverSelector.style.display = 'none';
        serverDetails.style.display = 'block';
        
        // Add server banner if available
        if (server.banner) {
            const bannerDiv = document.createElement('div');
            bannerDiv.className = 'server-banner';
            bannerDiv.style.backgroundImage = `url(${server.banner})`;
            serverCard.insertBefore(bannerDiv, serverCard.firstChild);
        }
        
        // Add server avatar if available
        if (server.icon) {
            const avatarDiv = document.createElement('div');
            avatarDiv.className = 'server-avatar';
            avatarDiv.style.backgroundImage = `url(${server.icon})`;
            serverCard.insertBefore(avatarDiv, serverCard.firstChild);
        }
        
        // Add event listener to the add role button
        const addRoleBtn = serverCard.querySelector('.add-role-btn');
        addRoleBtn.addEventListener('click', () => openRoleModal('add-role-synced', index));
        
        // Add event listener to the remove server button
        const removeServerBtn = serverCard.querySelector('.remove-server-btn');
        removeServerBtn.addEventListener('click', () => removeSyncedServer(index));
        
        // Initialize roles array if it doesn't exist
        if (!server.roles) {
            server.roles = [];
        }
        
        // Update roles list
        updateSyncedServerRolesUI(index, serverCard);
        
        syncedServersContainer.appendChild(serverCard);
    });
}

// Update the roles UI for a specific synced server
function updateSyncedServerRolesUI(serverIndex, serverCard = null) {
    if (serverIndex === null || !currentState.syncedServers[serverIndex]) return;
    
    // If serverCard is not provided, find it
    if (!serverCard) {
        serverCard = document.querySelector(`.server-card[data-server-index="${serverIndex}"]`);
        if (!serverCard) return;
    }
    
    const rolesList = serverCard.querySelector('.synced-server-roles');
    if (!rolesList) return;
    
    rolesList.innerHTML = '';
    
    const server = currentState.syncedServers[serverIndex];
    if (!server.roles) server.roles = [];
    
    server.roles.forEach((role, roleIndex) => {
        const li = document.createElement('li');
        
        // Create Sync ID badge based on whether the role has multiple Sync IDs
        let syncIdBadge;
        if (role.syncIds && role.syncIds.length > 0) {
            // Create a badge for multiple Sync IDs
            let syncIdItems = '';
            role.syncIds.forEach(id => {
                syncIdItems += `<span class="sync-id-item">ID: ${id}</span>`;
            });
            
            syncIdBadge = `<span class="sync-id-badge multiple" data-type="synced" data-server-index="${serverIndex}" data-role-index="${roleIndex}">${syncIdItems}</span>`;
        } else if (role.syncId) {
            // Create a badge for a single Sync ID
            syncIdBadge = `<span class="sync-id-badge" data-type="synced" data-server-index="${serverIndex}" data-role-index="${roleIndex}">ID: ${role.syncId}</span>`;
        } else {
            // Create an empty badge
            syncIdBadge = `<span class="sync-id-badge empty" data-type="synced" data-server-index="${serverIndex}" data-role-index="${roleIndex}">Set ID</span>`;
        }
        
        li.innerHTML = `
            <span style="color: ${role.color || 'white'}">${role.name} ${syncIdBadge}</span>
            <span class="remove-role" data-type="synced" data-server-index="${serverIndex}" data-role-index="${roleIndex}">
                <i class="fas fa-times"></i>
            </span>
        `;
        rolesList.appendChild(li);
    });
}

// Remove a synced server
function removeSyncedServer(index) {
    if (index === null || !currentState.syncedServers[index]) return;
    
    // Remove from state
    currentState.syncedServers.splice(index, 1);
    
    // Update UI
    updateSyncedServersUI();
}

// Remove a role
function removeRole(type, serverIndex, roleIndex) {
    if (type === 'main') {
        if (!currentState.mainServer || !currentState.mainServer.roles) return;
        currentState.mainServer.roles.splice(roleIndex, 1);
        updateMainServerRolesUI();
    } else if (type === 'synced') {
        if (!currentState.syncedServers[serverIndex] || !currentState.syncedServers[serverIndex].roles) return;
        currentState.syncedServers[serverIndex].roles.splice(roleIndex, 1);
        updateSyncedServerRolesUI(serverIndex);
    }
}

// Remove the main server
function removeMainServer() {
    // Reset main server to null
    currentState.mainServer = null;
    
    // Update UI
    const mainServerCard = document.querySelector('.main-server');
    const serverSelector = mainServerCard.querySelector('.server-selector');
    const serverDetails = mainServerCard.querySelector('.server-details');
    
    // Remove banner if exists
    const existingBanner = mainServerCard.querySelector('.server-banner');
    if (existingBanner) {
        existingBanner.remove();
    }
    
    // Show selector, hide details
    serverSelector.style.display = 'block';
    serverDetails.style.display = 'none';
}

// Handle delegated events (for dynamically created elements)
function handleDelegatedEvents(event) {
    // Handle remove main server button
    if (event.target.closest('#remove-main-server')) {
        removeMainServer();
        return;
    }
    
    // Handle remove role buttons
    if (event.target.closest('.remove-role')) {
        const removeBtn = event.target.closest('.remove-role');
        const type = removeBtn.dataset.type;
        const serverIndex = parseInt(removeBtn.dataset.serverIndex);
        const roleIndex = parseInt(removeBtn.dataset.index || removeBtn.dataset.roleIndex);
        
        removeRole(type, serverIndex, roleIndex);
    }
    
    // Handle add role buttons
    if (event.target.closest('.add-role-btn')) {
        const addRoleBtn = event.target.closest('.add-role-btn');
        const serverCard = addRoleBtn.closest('.server-card');
        
        if (serverCard.classList.contains('main-server')) {
            openRoleModal('add-role-main');
        } else {
            const serverIndex = parseInt(serverCard.dataset.serverIndex);
            openRoleModal('add-role-synced', serverIndex);
        }
    }
    
    // Handle Sync ID badges
    if (event.target.closest('.sync-id-badge')) {
        const badge = event.target.closest('.sync-id-badge');
        const type = badge.dataset.type;
        const serverIndex = parseInt(badge.dataset.serverIndex);
        const roleIndex = parseInt(badge.dataset.index || badge.dataset.roleIndex);
        
        openSyncIdModal(type, serverIndex, roleIndex);
    }
}

// Handle save configuration
async function handleSaveConfig() {
    try {
        // Validate configuration
        if (!currentState.mainServer) {
            alert('Please select a main server');
            return;
        }
        
        if (currentState.syncedServers.length === 0) {
            alert('Please add at least one synced server');
            return;
        }
        
        // Prepare configuration object
        const config = {
            mode: currentState.mode,
            mainServer: {
                id: currentState.mainServer.id,
                roles: currentState.mainServer.roles?.map(role => ({
                    id: role.id,
                    syncId: role.syncId
                })) || []
            },
            syncedServers: currentState.syncedServers.map(server => ({
                id: server.id,
                roles: server.roles?.map(role => {
                    // Include both syncId and syncIds in the configuration
                    const roleConfig = {
                        id: role.id,
                        syncId: role.syncId
                    };
                    
                    // Add syncIds if available
                    if (role.syncIds && role.syncIds.length > 0) {
                        roleConfig.syncIds = role.syncIds;
                    }
                    
                    return roleConfig;
                }) || []
            }))
        };
        
        // Save configuration
        await saveConfiguration(config);
        
        alert('Configuration saved successfully!');
    } catch (error) {
        console.error('Error saving configuration:', error);
        alert(`Error saving configuration: ${error.message}`);
    }
}

// Export for testing
export { currentState, updateDirectionArrow, openServerModal, openRoleModal };
