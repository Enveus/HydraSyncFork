# SyncBot

A Discord bot that synchronizes roles between one main server and multiple other Discord servers.

## Features

- **Two Operation Modes**:
  - **Regular Mode**: Syncs roles from one main server to multiple synced servers
  - **Reverse Mode**: Syncs roles from multiple synced servers back to a single main server
- **Automatic Role Synchronization**:
  - When roles are added/removed in the source server
  - When users join/leave servers
- **Slash Commands**:
  - `/add` - Add a role to a user across servers
  - `/remove` - Remove a role from a user across servers
  - `/role-checker` - Analyze and optionally force-sync roles
- **Performance Optimizations**:
  - Batch processing for large servers
  - Caching for frequently accessed data
  - Rate limit handling with exponential backoff
- **Comprehensive Logging**:
  - Console logging with color coding
  - Discord channel logging for important events

## Requirements

- Node.js v16.x
- Discord Bot Token
- Discord Application ID
- Server IDs (main server and synced servers)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/jonathonor/syncBot.git
   cd syncBot
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `config.json` file based on the provided template:
   ```
   cp config.example.json config.json
   ```

4. Edit the `config.json` file with your bot token, application ID, and server IDs.

## Usage

### Using the CLI

SyncBot includes a command-line interface for easy operation:

```
# Start in regular mode (main → synced)
npm run start

# Start in reverse mode (synced → main)
npm run start:reverse

# Register commands for the main server
npm run register

# Register commands globally
npm run register:global

# Start in debug mode
npm run debug
```

### Manual Command Usage

You can also run the bot directly:

```
# Start in regular mode
node bin/syncbot.js start

# Start in reverse mode
node bin/syncbot.js start-reverse

# Register commands for the main server
node bin/syncbot.js register

# Register commands globally
node bin/syncbot.js register-global

# Show help
node bin/syncbot.js --help
```

## Configuration

The `config.json` file should have the following structure:

```json
{
    "token": "BOT TOKEN HERE",
    "applicationId": "BOT CLIENT ID HERE",
    "mainServer": "MAIN SERVER ID HERE",
    "syncedServers": ["SYNCED SERVER ID HERE", "ADDITIONAL SYNCED SERVER ID HERE"],
    "allowedRoleId": "ROLE ID FOR PERMISSIONS",
    "allowedRoleName": "ROLE NAME FOR PERMISSIONS (for reverse mode only)",
    "logChannelId": "LOG CHANNEL ID HERE (must be in main server)"
}
```

## Project Structure

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

## License

ISC
