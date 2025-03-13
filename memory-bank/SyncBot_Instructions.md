# 🤖 SyncBot - Discord Role Synchronization Bot

## 📋 Overview

SyncBot is a powerful Discord bot that synchronizes roles between Discord servers. It operates in two modes:

**Regular Mode**: Syncs roles from one main server to multiple synced servers
**Reverse Mode**: Syncs roles from multiple synced servers back to one main server

## 🔧 Setup Requirements

- Bot must have the **Manage Roles** permission in all servers
- Bot's role must be **higher in hierarchy** than any roles it will manage
- Bot must be a member of all servers it will manage
- A dedicated log channel in the main server

## 🚀 Getting Started

### Configuration

The bot requires a `config.json` file with the following information:

```json
{
    "token": "BOT TOKEN HERE",
    "applicationId": "BOT CLIENT ID HERE",
    "mainServer": "MAIN SERVER ID HERE",
    "syncedServers": ["SYNCED SERVER ID 1", "SYNCED SERVER ID 2"],
    "allowedRoleId": "ROLE ID FOR PERMISSIONS",
    "logChannelId": "LOG CHANNEL ID HERE (in main server)"
}
```

### Starting the Bot

**Using npm scripts** (Recommended):

For Regular Mode (Main → Synced):
```
npm run start
```

For Reverse Mode (Synced → Main):
```
npm run start:reverse
```

**Using the CLI directly**:

For Regular Mode (Main → Synced):
```
node bin/syncbot.js start
```

For Reverse Mode (Synced → Main):
```
node bin/syncbot.js start-reverse
```

**Registering Commands**:

Register commands for the main server:
```
npm run register
```

Register commands globally:
```
npm run register:global
```

**With UI Dashboard**:

Start the bot with UI dashboard:
```
npm run start:ui
```

Start the bot with UI dashboard and open in browser:
```
npm run start:ui:browser
```

Start only the UI dashboard:
```
npm run ui
```

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

## 🆕 Sync ID Feature

SyncBot now supports Sync IDs for more flexible role linking:

1. **What are Sync IDs?**: Unique identifiers (1-50) that link roles across servers
2. **How it works**: Roles with the same Sync ID are treated as linked, regardless of name
3. **Benefits**:
   - Roles can have different names across servers
   - More precise control over which roles are linked
   - Smarter role removal that preserves roles if present in other synced servers
4. **Configuration**: Sync IDs can be configured through the UI dashboard

## 🌐 UI Dashboard

SyncBot includes a web-based UI dashboard for easier configuration:

1. **Features**:
   - Server management (add/remove servers)
   - Role management (add/remove roles)
   - Sync ID configuration
   - Mode selection (Regular/Reverse)
   - Status monitoring

2. **Access**:
   - Start with UI: `npm run start:ui`
   - Start with UI and open browser: `npm run start:ui:browser`
   - UI only: `npm run ui`

3. **Configuration**:
   - Changes made in the UI are saved to `ui-config.json`
   - The bot automatically merges this with `config.json`

## ⚠️ Important Notes

1. **Role Linking**: Roles are linked by Sync ID (if configured) or by name
2. **Role Hierarchy**: The bot cannot modify roles higher than its own role in the hierarchy
3. **Permissions**: The bot requires "Manage Roles" permission in all servers
4. **Performance**: The role-checker command can be resource-intensive for large servers
5. **Error Handling**: Check the log channel for any errors or issues

## 🔍 Troubleshooting

### Common Issues:

- **Roles not syncing**: Ensure roles are properly linked by Sync ID or have matching names
- **Permission errors**: Check that the bot's role is higher than roles it's managing
- **Bot not responding**: Verify the bot is running and has proper permissions
- **Command not working**: Ensure you have the allowed role specified in the config
- **UI not showing real data**: Make sure the bot is running with the `--ui` flag

### Debug Mode:

Run the bot in debug mode for more detailed logging:
```
npm run debug
```

### For detailed logs and errors:

Check the designated log channel in your main server for detailed information about bot operations and any errors that occur.

## 📚 Additional Resources

- [Official Documentation](https://www.jonsbots.com/syncbot)
- [GitHub Repository](https://github.com/jonathonor/syncbot)
- [Support Discord](https://discord.gg/f8SUVvQZD3)

---

*For more information or to report issues, visit [jonsbots.com](https://jonsbots.com) or join the [support Discord](https://discord.gg/f8SUVvQZD3).*
