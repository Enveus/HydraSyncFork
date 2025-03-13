# Product Context: SyncBot

## What is SyncBot?
SyncBot is a Discord bot that synchronizes roles between Discord servers. It was created in 2019 as a side project to help server owners manage roles across multiple Discord servers.

## Problems SyncBot Solves
- **Role Management Across Multiple Servers**: Server owners often need to maintain consistent roles for users across multiple Discord servers, especially when these servers are related (e.g., for different aspects of the same community or organization).
- **Manual Role Assignment Overhead**: Without SyncBot, server administrators would need to manually assign or remove roles in each server whenever a user's status changes.
- **Consistency Challenges**: Maintaining consistent role assignments across servers is error-prone when done manually.
- **User Experience**: Users expect their roles/permissions to be consistent across related servers.

## How SyncBot Works

### Two Operation Modes

#### 1. Regular SyncBot (Main Server → Synced Servers)
- Roles are synchronized from one main server to multiple synced servers
- When a role is added to a user in the main server, it's automatically added in all synced servers
- When a role is removed from a user in the main server, it's automatically removed in all synced servers
- When a user joins a synced server, roles from the main server are automatically applied
- When a user leaves the main server, their roles are removed from all synced servers

#### 2. Reverse SyncBot (Synced Servers → Main Server)
- Roles are synchronized from multiple synced servers back to a single main server
- When a role is added to a user in a synced server, it's automatically added in the main server
- When a role is removed from a user in a synced server, it's automatically removed in the main server
- When a user joins the main server, roles from synced servers are automatically applied
- When a user leaves a synced server, their roles from that server are removed from the main server

### Key Features
- **Slash Commands**: `/add`, `/remove`, and `/role-checker` commands for manual role management
- **Automatic Role Synchronization**: Monitors role changes and server join/leave events
- **Role Verification**: The `/role-checker` command can analyze role discrepancies and force-sync roles
- **Permission System**: Configurable permissions to control who can use the bot's commands

### Configuration
SyncBot is configured through a `config.json` file that specifies:
- Bot token and application ID
- Main server ID
- Synced server IDs (array)
- Allowed role ID/name for command permissions
- Log channel ID for activity logging

## Use Cases
- Communities with multiple specialized Discord servers
- Organizations with tiered access across different servers
- Gaming communities with different servers for different games
- Educational institutions with different servers for different courses/departments
- Subscription-based communities where roles represent access levels
