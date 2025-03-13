# __**🤖 SyncBot - Discord Role Synchronization Bot**__

## **📋 Overview**

SyncBot is a powerful Discord bot that synchronizes roles between Discord servers. It operates in two modes:

• **Regular Mode**: Syncs roles from one main server to multiple synced servers
• **Reverse Mode**: Syncs roles from multiple synced servers back to one main server

## **🔧 Setup Requirements**

• Bot must have the **Manage Roles** permission in all servers
• Bot's role must be **higher in hierarchy** than any roles it will manage
• Bot must be a member of all servers it will manage
• A dedicated log channel in the main server

## **🚀 Getting Started**

### **Configuration**

The bot requires a `config.json` file with the following information:

```json
{
    "token": "BOT TOKEN HERE",
    "applicationId": "BOT CLIENT ID HERE",
    "mainServer": "MAIN SERVER ID HERE",
    "syncedServers": ["SYNCED SERVER ID 1", "SYNCED SERVER ID 2"],
    "allowedRoleId": "ROLE ID FOR PERMISSIONS",
    "allowedRoleName": "ROLE NAME FOR PERMISSIONS (for reverse mode)",
    "logChannelId": "LOG CHANNEL ID HERE (in main server)"
}
```

### **Starting the Bot**

**For Regular Mode** (Main → Synced):
```
node MainToSync.js
```

**For Reverse Mode** (Synced → Main):
```
node SyncedToMain.js
```

These simplified startup scripts will automatically register the appropriate commands and start the bot in the selected mode.

## **💻 Commands**

SyncBot provides the following slash commands:

### **/add @role @user**
Adds the specified role to the user across all synchronized servers.
• **Permissions**: Requires the role specified in `allowedRoleId`/`allowedRoleName` or server owner
• **Example**: `/add @Subscriber @JohnDoe`

### **/remove @role @user**
Removes the specified role from the user across all synchronized servers.
• **Permissions**: Requires the role specified in `allowedRoleId`/`allowedRoleName` or server owner
• **Example**: `/remove @Subscriber @JohnDoe`

### **/role-checker [option]**
Analyzes role discrepancies between servers and optionally force-syncs roles.
• **Options**:
  - `analyze`: Sends you a DM with a detailed analysis of role discrepancies
  - `force-sync`: Forces all roles to sync according to the bot's mode
• **Permissions**: Requires the role specified in `allowedRoleId`/`allowedRoleName` or server owner
• **Example**: `/role-checker analyze`

## **🔄 Automatic Synchronization**

### **Regular Mode (Main → Synced)**

| Event | Action |
| ----- | ------ |
| User joins main server | No action |
| User joins synced server | Roles from main server are applied |
| User leaves main server | Roles are removed in all synced servers |
| User leaves synced server | No action |
| Role added in main server | Role is added in all synced servers |
| Role removed in main server | Role is removed in all synced servers |

### **Reverse Mode (Synced → Main)**

| Event | Action |
| ----- | ------ |
| User joins main server | Roles from synced servers are applied |
| User joins synced server | No action |
| User leaves main server | No action |
| User leaves synced server | Roles from that server are removed in main server |
| Role added in synced server | Role is added in main server |
| Role removed in synced server | Role is removed in main server |

## **⚠️ Important Notes**

1. **Role Names Must Match**: The bot identifies roles by name, so ensure role names match exactly across servers
2. **Role Hierarchy**: The bot cannot modify roles higher than its own role in the hierarchy
3. **Permissions**: The bot requires "Manage Roles" permission in all servers
4. **Performance**: The role-checker command can be resource-intensive for large servers
5. **Error Handling**: Check the log channel for any errors or issues

## **🔍 Troubleshooting**

### **Common Issues:**

• **Roles not syncing**: Ensure role names match exactly across servers
• **Permission errors**: Check that the bot's role is higher than roles it's managing
• **Bot not responding**: Verify the bot is running and has proper permissions
• **Command not working**: Ensure you have the allowed role specified in the config

### **For detailed logs and errors:**

Check the designated log channel in your main server for detailed information about bot operations and any errors that occur.

---

*For more information or to report issues, contact your server administrator.*
