# System Patterns: SyncBot

## Architecture Overview

SyncBot follows an event-driven architecture built on Discord.js, where the bot responds to Discord events and user commands to synchronize roles across servers.

## Current Architecture

### Key Components

#### 1. Command System
- Uses Discord's slash command system
- Commands are defined in separate modules:
  - `src/commands/add.js`: Handles adding roles
  - `src/commands/remove.js`: Handles removing roles
  - `src/commands/role-checker.js`: Handles role checking and syncing
  - `src/commands/index.js`: Handles command registration and routing

#### 2. Event System
- Event handlers are organized by mode:
  - `src/events/common.js`: Common event handlers for both modes
  - `src/events/regular-mode.js`: Event handlers for regular mode (main → synced)
  - `src/events/reverse-mode.js`: Event handlers for reverse mode (synced → main)
  - `src/events/index.js`: Sets up all event handlers

#### 3. Utility Functions
- Utility functions are organized by purpose:
  - `src/utils/logging.js`: Logging utilities
  - `src/utils/permissions.js`: Permission checking utilities
  - `src/utils/role-management.js`: Role management utilities
  - `src/utils/rate-limiting.js`: Rate limit handling utilities
  - `src/utils/member-processing.js`: Member processing utilities
  - `src/utils/index.js`: Exports all utilities

#### 4. Configuration
- Configuration handling is centralized:
  - `src/config/validation.js`: Configuration validation
  - `src/config/index.js`: Configuration loading and export

#### 5. Entry Points
- Unified entry point with mode selection:
  - `src/index.js`: Main entry point
  - `bin/syncbot.js`: CLI interface

### Directory Structure

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

## Technical Decisions

### 1. Modular Architecture
- Each component is in its own module
- Clear separation of concerns
- Easier to maintain and extend
- Preparation for future UI dashboard

### 2. Discord.js Framework
- Uses Discord.js v14 for Discord API interaction
- Leverages Discord's slash command system for better user experience

### 3. ES Modules
- Project uses ES modules (`import`/`export`) instead of CommonJS
- Configured via `"type": "module"` in package.json

### 4. Configuration Approach
- External configuration via `config.json`
- Configuration validation on startup
- Example configuration provided in `config.example.json`
- Future support for environment variables and UI dashboard

### 5. Error Handling
- Comprehensive error handling for Discord API interactions
- Detailed error messages sent to users and logged to console
- Rate limit handling with exponential backoff

### 6. Role Analysis System
- Dedicated system for analyzing role discrepancies
- Can operate in analysis-only or force-sync modes
- Results delivered via DM to avoid cluttering server channels
- Batch processing for better performance

## Data Flow Patterns

### Regular SyncBot Mode
1. Event or command triggers role change in main server
2. Bot identifies the role change
3. Bot finds the same role by name in each synced server
4. Bot applies the same change to matching roles in synced servers
5. Results are logged to the designated channel

### Reverse SyncBot Mode
1. Event or command triggers role change in a synced server
2. Bot identifies the role change
3. Bot finds the same role by name in the main server
4. Bot applies the same change to the matching role in the main server
5. Results are logged to the designated channel

## Performance Considerations

- Role-checker operations can be resource-intensive for servers with many members
- Throttling mechanism prevents duplicate role updates
- Asynchronous operations for better performance
- Batch processing for large member lists
- Caching strategies for frequently accessed data

## Future Considerations

- **UI Dashboard**: The new architecture will support a future UI dashboard for configuration
- **Database Integration**: Preparation for persistent storage of configuration and state
- **Role Mapping**: Support for mapping different role names between servers
- **Selective Synchronization**: Only sync specific roles based on configuration
