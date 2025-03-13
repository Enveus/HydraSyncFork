# SyncBot

A Discord bot that synchronizes roles between Discord servers, with support for both regular (main → synced) and reverse (synced → main) synchronization modes.

<div align="center">
  <img src="https://img.shields.io/badge/node-v16.x-green" alt="Node.js v16.x">
  <img src="https://img.shields.io/badge/discord.js-v14.0.3-blue" alt="Discord.js v14.0.3">
  <img src="https://img.shields.io/badge/license-ISC-lightgrey" alt="License: ISC">
</div>

## 📋 Table of Contents

- [Features](#-features)
- [Requirements](#-requirements)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [UI Dashboard](#-ui-dashboard)
- [Sync ID Feature](#-sync-id-feature)
- [Commands](#-commands)
- [Automatic Synchronization](#-automatic-synchronization)
- [Troubleshooting](#-troubleshooting)
- [Project Structure](#-project-structure)
- [License](#-license)

## ✨ Features

- **Two Operation Modes**:
  - **Regular Mode**: Syncs roles from one main server to multiple synced servers
  - **Reverse Mode**: Syncs roles from multiple synced servers back to a single main server
- **Sync ID System**:
  - Link roles across servers with different names
  - More precise control over which roles are synchronized
  - Smart role removal that preserves roles if present in other synced servers
- **Web-based UI Dashboard**:
  - Configure servers and roles through a user-friendly interface
  - Manage Sync IDs visually
  - Monitor bot status
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

## 📋 Requirements

- Node.js v16.x
- Discord Bot Token (from Discord Developer Portal)
- Discord Application ID
- Server IDs (main server and synced servers)
- Bot must have "Manage Roles" permission in all servers
- Bot's role must be higher in hierarchy than roles it will manage

## 🚀 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/jonathonor/syncBot.git
   cd syncBot
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create configuration file**:
   ```bash
   cp config.example.json config.json
   ```

4. **Edit the configuration file**:
   Open `config.json` in your preferred text editor and add your:
   - Bot token
   - Application ID
   - Main server ID
   - Synced server IDs
   - Allowed role ID (for command permissions)
   - Log channel ID

5. **Register commands**:
   ```bash
   # For regular mode (main server only)
   npm run register
   
   # For reverse mode (global registration)
   npm run register:global
   ```

6. **Optional: Install globally**:
   ```bash
   npm run install-global
   ```
   This allows you to run the bot using the `syncbot` command from any directory.

## ⚙️ Configuration

The `config.json` file should have the following structure:

```json
{
    "token": "BOT TOKEN HERE",
    "applicationId": "BOT CLIENT ID HERE",
    "mainServer": "MAIN SERVER ID HERE",
    "syncedServers": ["SYNCED SERVER ID 1", "SYNCED SERVER ID 2"],
    "allowedRoleId": "ROLE ID FOR PERMISSIONS",
    "logChannelId": "LOG CHANNEL ID HERE (must be in main server)"
}
```

### Configuration Fields:

- **token**: Your Discord bot token from the Discord Developer Portal
- **applicationId**: Your bot's application ID (also called client ID)
- **mainServer**: The ID of your main server
- **syncedServers**: An array of IDs for the servers you want to sync with
- **allowedRoleId**: The ID of the role that can use the bot's commands
- **logChannelId**: The ID of the channel where the bot will log its activities

## 🔧 Usage

### Starting the Bot

**Using npm scripts** (Recommended):

```bash
# Start in regular mode (main → synced)
npm run start

# Start in reverse mode (synced → main)
npm run start:reverse

# Start in debug mode (regular)
npm run debug

# Start in debug mode (reverse)
npm run debug:reverse
```

**Using the CLI directly**:

```bash
# Start in regular mode
node bin/syncbot.js start

# Start in reverse mode
node bin/syncbot.js start-reverse

# Show help
node bin/syncbot.js --help
```

**If installed globally**:

```bash
# Start in regular mode
syncbot start

# Start in reverse mode
syncbot start-reverse

# Show help
syncbot --help
```

### With UI Dashboard

```bash
# Start bot with UI dashboard
npm run start:ui

# Start bot with UI dashboard and open in browser
npm run start:ui:browser

# Start only the UI dashboard
npm run ui

# Start reverse mode with UI dashboard
npm run start:reverse:ui

# Start reverse mode with UI dashboard and open in browser
npm run start:reverse:ui:browser
```

## 🌐 UI Dashboard

SyncBot includes a web-based UI dashboard for easier configuration:

### Features:

- Server management (add/remove servers)
- Role management (add/remove roles)
- Sync ID configuration
- Mode selection (Regular/Reverse)
- Status monitoring

### Accessing the Dashboard:

The dashboard runs on http://localhost:3000 by default. You can access it by:

1. Starting the bot with the UI: `npm run start:ui`
2. Starting the bot with the UI and automatically opening the browser: `npm run start:ui:browser`
3. Running just the UI server: `npm run ui`

### Configuration via UI:

Changes made in the UI are saved to `ui-config.json` and automatically merged with your `config.json` settings.

## 🔄 Sync ID Feature

SyncBot now supports Sync IDs for more flexible role linking:

### What are Sync IDs?

Sync IDs are unique identifiers (1-50) that link roles across servers, regardless of their names.

### Benefits:

- Roles can have different names across servers
- More precise control over which roles are linked
- Smarter role removal that preserves roles if present in other synced servers

### Configuration:

Sync IDs can be configured through the UI dashboard by:
1. Selecting a server
2. Choosing roles to sync
3. Assigning the same Sync ID to roles that should be linked

## 💻 Commands

SyncBot provides the following slash commands:

### `/add @role @user`
Adds the specified role to the user across all synchronized servers.
- **Permissions**: Requires the role specified in `allowedRoleId` or server owner
- **Example**: `/add @Subscriber @JohnDoe`

### `/remove @role @user`
Removes the specified role from the user across all synchronized servers.
- **Permissions**: Requires the role specified in `allowedRoleId` or server owner
- **Example**: `/remove @Subscriber @JohnDoe`

### `/role-checker [option]`
Analyzes role discrepancies between servers and optionally force-syncs roles.
- **Options**:
  - `analyze`: Sends you a DM with a detailed analysis of role discrepancies
  - `force-sync`: Forces all roles to sync according to the bot's mode
- **Permissions**: Requires the role specified in `allowedRoleId` or server owner
- **Example**: `/role-checker analyze`

## 🔄 Automatic Synchronization

### Regular Mode (Main → Synced)

| Event | Action |
| ----- | ------ |
| User joins main server | No action |
| User joins synced server | Roles from main server are applied |
| User leaves main server | Roles are removed in all synced servers |
| User leaves synced server | No action |
| Role added in main server | Role is added in all synced servers |
| Role removed in main server | Role is removed in all synced servers |

### Reverse Mode (Synced → Main)

| Event | Action |
| ----- | ------ |
| User joins main server | Roles from synced servers are applied |
| User joins synced server | No action |
| User leaves main server | No action |
| User leaves synced server | Roles from that server are removed in main server (only if not present in other synced servers) |
| Role added in synced server | Role is added in main server |
| Role removed in synced server | Role is removed in main server (only if not present in other synced servers) |

## 🔍 Troubleshooting

### Common Issues:

- **Roles not syncing**: Ensure roles are properly linked by Sync ID or have matching names
- **Permission errors**: Check that the bot's role is higher than roles it's managing
- **Bot not responding**: Verify the bot is running and has proper permissions
- **Command not working**: Ensure you have the allowed role specified in the config
- **UI not showing real data**: Make sure the bot is running with the `--ui` flag

### Debug Mode:

Run the bot in debug mode for more detailed logging:
```bash
npm run debug
```

### For detailed logs and errors:

Check the designated log channel in your main server for detailed information about bot operations and any errors that occur.

## 📁 Project Structure

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
│   │   ├── sync-id-management.js
│   │   └── index.js
│   ├── config/             # Configuration handling
│   │   ├── validation.js
│   │   ├── merged-config.js
│   │   └── index.js
│   ├── web/                # UI Dashboard
│   │   ├── public/         # Static files
│   │   ├── css/            # Stylesheets
│   │   ├── js/             # Client-side JavaScript
│   │   ├── api/            # API endpoints
│   │   ├── server.js       # Express server
│   │   ├── start.js        # Server startup
│   │   └── integration.js  # Bot integration
│   ├── client.js           # Discord client creation
│   └── index.js            # Main entry point
├── bin/                    # CLI scripts
│   └── syncbot.js          # Unified CLI entry point
├── config.json             # Configuration file
└── config.example.json     # Example configuration
```

## 📄 License

ISC
