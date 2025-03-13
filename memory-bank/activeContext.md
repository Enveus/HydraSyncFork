# Active Context: SyncBot

## Current Focus
We have implemented the Sync ID-based role linking functionality for SyncBot and completed Phase 1 of the UI dashboard integration with the Discord bot. We are now focusing on testing these features and implementing the remaining phases of the UI dashboard integration.

Key aspects of the Sync ID implementation:
1. ✅ Each role is assigned a Sync ID (1-50) through the UI
2. ✅ Roles with the same Sync ID are treated as linked across servers
3. ✅ If a role with Sync ID 5 is removed from a user in a synced server, and they don't have any other roles with Sync ID 5 in other synced servers, the corresponding role is removed from the main server
4. ✅ If a role with Sync ID 5 is removed from the main server, it is removed from all synced servers
5. ✅ The UI displays the Sync ID for each role and allows users to select/change it
6. ✅ When a user joins the Main Server, it automatically checks all synced servers for roles and applies them
7. ✅ When a user is kicked from a Synced Server, it removes role IDs from the Main Server only if they're not present in any other Synced Server

Key aspects of the UI dashboard integration (Phase 1):
1. ✅ Merged configuration system that combines `config.json` and `ui-config.json`
2. ✅ API endpoints to fetch Discord servers and roles
3. ✅ Configuration management endpoints
4. ✅ Status information endpoint
5. ✅ CLI updates to support UI-related commands and options

Our achievements include:
1. ✅ Breaking apart large files into smaller, more focused modules
2. ✅ Removing unnecessary duplicate files
3. ✅ Creating a more organized directory structure
4. ✅ Unifying common code patterns
5. ✅ Preparing the codebase for future UI dashboard integration
6. ✅ Implementing Sync ID-based role linking functionality
7. ✅ Creating a UI dashboard prototype with Sync ID management
8. ✅ Integrating the UI dashboard with the Discord bot (Phase 1)

## Recent Changes
- Implemented Sync ID-based role linking functionality:
  - ✅ Modified role synchronization logic to use Sync IDs instead of just role names
  - ✅ Updated event handlers to handle Sync ID-based role removal logic
  - ✅ Enhanced the UI to allow selection of Sync IDs for each role
- Created comprehensive test plan for Sync ID-based role linking functionality
- Developed detailed UI dashboard integration plan
- Enhanced role-checker command to include errors in a separate text file instead of only in the JSON results
- Implemented Phase 1 of the UI dashboard integration:
  - ✅ Created a merged configuration system
  - ✅ Implemented API endpoints for Discord servers and roles
  - ✅ Added configuration management endpoints
  - ✅ Created an integration module to connect the UI server with the Discord bot
  - ✅ Enhanced the CLI to support UI-related commands and options
- Enhanced role synchronization functionality:
  - ✅ Added automatic role checking when a user joins the Main Server
  - ✅ Improved role removal logic when a user is kicked from a Synced Server
  - ✅ Implemented smarter role management that only removes roles from the Main Server if they're not present in any other Synced Server
- Improved UI dashboard design:
  - ✅ Redesigned server title cards with server avatars overlaying the banner on the left
  - ✅ Centered server names in the available space to the right of the avatar
  - ✅ Enhanced visual hierarchy and readability of server information
  - ✅ Added light grey background to X buttons for better visibility
  - ✅ Vertically aligned server names with avatars for cleaner appearance
- Created a modular architecture with clear separation of concerns
- Organized code into logical directories:
  - `src/commands/`: Command handlers
  - `src/events/`: Event handlers
  - `src/utils/`: Utility functions
  - `src/config/`: Configuration handling
- Created a unified CLI interface in `bin/syncbot.js`
- Removed legacy files and code
- Updated package.json with new scripts
- Created comprehensive documentation in README.md
- Updated Memory Bank with new architecture details
- Added .gitignore file to exclude sensitive configuration files, development artifacts, and Cline-specific files (.clinerules and memory-bank/)

## Project Overview
SyncBot is a Discord bot with two operational modes:
1. **Regular Mode**: Syncs roles from one main server to multiple synced servers
2. **Reverse Mode**: Syncs roles from multiple synced servers back to a single main server

The bot uses Discord.js to interact with the Discord API and provides slash commands for manual role management along with automatic role synchronization based on Discord events.

## Current State
The project is fully functional with a new modular architecture:
- Code is organized into logical modules
- Each component has a single responsibility
- Common functionality is shared between modes
- Configuration is centralized
- CLI interface provides a unified entry point

## Repository Structure (New)
```
syncBot/
├── src/
│   ├── commands/           # Command handlers
│   │   ├── add.js
│   │   ├── remove.js
│   │   ├── role-checker.js
│   │   └── index.js        # Command registration
│   ├── events/             # Event handlers
│   │   ├── common.js
│   │   ├── regular-mode.js
│   │   ├── reverse-mode.js
│   │   └── index.js        # Event registration
│   ├── utils/              # Utility functions
│   │   ├── logging.js
│   │   ├── permissions.js
│   │   ├── role-management.js
│   │   ├── rate-limiting.js
│   │   ├── member-processing.js
│   │   └── index.js
│   ├── config/             # Configuration handling
│   │   ├── validation.js
│   │   └── index.js
│   ├── client.js           # Discord client creation
│   └── index.js            # Main entry point
├── bin/                    # CLI scripts
│   └── syncbot.js          # Unified CLI entry point
├── config.json             # Configuration file
└── config.example.json     # Example configuration
```

## Next Steps
1. Test the Sync ID-based role linking functionality:
   - Execute the test plan in memory-bank/test-plan.md
   - Document test results and fix any issues found
2. Test the UI dashboard integration:
   - Run the bot with the UI dashboard using `syncbot start --ui --open-browser`
   - Verify that the UI can display actual Discord servers and roles
   - Verify that configuration changes in the UI are applied to the bot
3. Implement Phase 2 of the UI dashboard integration:
   - Add WebSocket server for real-time communication
   - Implement authentication for the UI
   - Add real-time status updates
4. Implement Phase 3 of the UI dashboard integration:
   - Add role hierarchy awareness
   - Add permission management
   - Implement audit logging

## Current Tasks
- [x] Create a new directory structure
- [x] Refactor code into smaller, more focused modules
- [x] Consolidate command registration logic
- [x] Create a unified entry point
- [x] Update documentation to reflect the new structure
- [x] Prepare for future UI dashboard integration
- [x] Implement UI dashboard prototype
- [x] Implement Sync ID-based role linking functionality
- [x] Create test plan for Sync ID-based role linking
- [x] Create UI dashboard integration plan
- [x] Integrate UI dashboard with Discord bot (Phase 1)
- [ ] Execute test plan for Sync ID-based role linking
- [ ] Test UI dashboard integration
- [ ] Implement UI dashboard integration (Phase 2)
- [ ] Implement UI dashboard integration (Phase 3)

## UI Dashboard Implementation
We have implemented a prototype of the UI dashboard with the following features:

1. **Web-based Interface**: Created using HTML, CSS, and JavaScript
2. **Server**: Express.js server to serve the UI and handle API requests
3. **Mode Selection**: Dropdown to select between "Main → Many" or "Many to Main" modes
4. **Server Management**: 
   - Add main server
   - Add multiple synced servers
   - Remove synced servers
   - Visual server cards with server avatars and banners
5. **Role Management**:
   - Add roles to main server
   - Add roles to synced servers
   - Remove roles from servers
   - Sync ID assignment and visualization
6. **Configuration Saving**: Save configuration to be used by the bot

The UI dashboard now supports both mock data (when running standalone) and real Discord data (when integrated with the bot). The integration can be tested by running `syncbot start --ui --open-browser` or `syncbot ui` for the standalone UI server.

### UI Structure
```
src/web/
├── public/           # Static files
│   └── index.html    # Main HTML file
├── css/              # Stylesheets
│   └── styles.css    # Main CSS file
├── js/               # JavaScript files
│   ├── app.js        # Main application logic
│   └── api.js        # API communication module
├── server.js         # Express server
└── start.js          # Server startup script
```

### Running the UI
The UI can be started using the following npm scripts:
- `npm run ui`: Starts the UI server and opens it in the default browser
- `npm run ui:server`: Starts only the UI server without opening the browser

## Notes
- The project uses ES Modules syntax
- Node.js v16.11.1 is required
- Configuration is done through a config.json file based on the provided template
- The new architecture is designed to be easily extended with new features
