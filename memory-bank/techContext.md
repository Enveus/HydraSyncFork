# Technical Context: SyncBot

## Technologies Used

### Core Technologies
- **Node.js**: Runtime environment (v16.11.1 required)
- **Discord.js**: Main library for Discord API interaction (v14.0.3)
- **@discordjs/rest**: REST API client for Discord API
- **discord-api-types**: Type definitions for Discord API
- **axios**: HTTP client for API requests
- **lowdb**: Simple JSON database (dependency listed but usage not evident in current code)

### Development Environment
- **JavaScript (ES Modules)**: Primary programming language
- **Git**: Version control system
- **npm**: Package manager

## Development Setup

### Prerequisites
- Node.js v16.11.1 or compatible
- Discord Bot Token (from Discord Developer Portal)
- Discord Application ID
- Server IDs (main server and synced servers)

### Installation Steps
1. Clone the repository: `git clone https://github.com/jonathonor/syncBot.git`
2. Navigate to project directory: `cd syncBot`
3. Install dependencies: `npm install discord.js @discordjs/rest discord-api-types axios`
4. Create `config.json` based on `config.example.json` template
5. Register slash commands:
   - For regular mode: `node register.js`
   - For reverse mode: `node registerGlobal.js`
6. Start the bot:
   - For regular mode: `node run.js`
   - For reverse mode: `node runReverse.js`

### Configuration
Create a `config.json` file with the following structure:
```json
{
    "token": "BOT TOKEN HERE",
    "applicationId": "BOT CLIENT ID HERE",
    "mainServer": "MAIN SERVER ID HERE",
    "syncedServers": ["SYNCED SERVER ID HERE", "ADDITIONAL SYNCED SERVER ID HERE"],
    "allowedRoleId": "ROLE ID FOR PERMISSIONS",
    "allowedRoleName": "ROLE NAME FOR PERMISSIONS (for runReverse only)",
    "logChannelId": "LOG CHANNEL ID HERE (must be in main server)"
}
```

## Technical Constraints

### Discord API Limitations
- Rate limits on API requests
- Permissions required for role management
- Bot must be a member of all servers it manages
- Bot's role must be higher in hierarchy than roles it manages

### Node.js Version Requirements
- Requires Node.js v16.x
- ES Modules syntax used throughout the codebase

### Bot Permissions
- Requires "Manage Roles" permission in all servers
- Requires "Send Messages" permission for logging
- Cannot modify roles higher than its own role in the hierarchy
- Cannot modify server owner or other bots

### Performance Considerations
- Role-checker operations can be resource-intensive for large servers
- Fetching all members can consume significant memory for large servers
- Discord API rate limits may affect operations on servers with many members

### Deployment Considerations
- Requires persistent hosting for 24/7 operation
- Needs stable internet connection
- Token security is critical (should never be exposed publicly)

## Debugging

### Debug Mode
- Debug mode can be enabled by passing 'debug' as an argument: `node run.js debug`
- Provides verbose logging of operations

### Common Issues
- Bot not in all servers listed in config
- Missing permissions for role management
- Role hierarchy issues (bot's role lower than roles it tries to manage)
- Invalid configuration values
- Discord API rate limiting

### Logging
- Console logging with color coding for different severity levels:
  - Red: Errors
  - Yellow: Warnings
  - Blue: Information
- In-Discord logging to the configured log channel
