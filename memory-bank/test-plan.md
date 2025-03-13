# Test Plan: Sync ID-based Role Linking

## Overview
This test plan outlines the steps to verify that the Sync ID-based role linking functionality works correctly in both regular and reverse modes.

## Prerequisites
- Discord bot token configured in config.json
- At least one main server and one synced server configured
- Bot has appropriate permissions in all servers
- Test users who are members of both main and synced servers

## Test Cases

### 1. Configuration Tests

#### 1.1 UI Configuration
- [ ] Verify that the UI allows selecting Sync IDs (1-50) for roles
- [ ] Verify that the UI displays the current Sync ID for each role
- [ ] Verify that the configuration is saved correctly to ui-config.json
- [ ] Verify that the configuration can be loaded from ui-config.json

#### 1.2 Bot Configuration
- [ ] Verify that the bot loads the Sync ID configuration correctly
- [ ] Verify that the bot applies the Sync ID configuration to its internal state

### 2. Regular Mode Tests (Main → Synced)

#### 2.1 Role Addition
- [ ] Add a role with Sync ID 5 to a user in the main server
- [ ] Verify that roles with Sync ID 5 are added to the user in all synced servers
- [ ] Verify that the operation is logged correctly

#### 2.2 Role Removal
- [ ] Remove a role with Sync ID 5 from a user in the main server
- [ ] Verify that roles with Sync ID 5 are removed from the user in all synced servers
- [ ] Verify that the operation is logged correctly

#### 2.3 User Joins Synced Server
- [ ] Have a user with a role with Sync ID 5 in the main server join a synced server
- [ ] Verify that roles with Sync ID 5 are added to the user in the synced server
- [ ] Verify that the operation is logged correctly

#### 2.4 User Leaves Main Server
- [ ] Have a user with a role with Sync ID 5 leave the main server
- [ ] Verify that roles with Sync ID 5 are removed from the user in all synced servers
- [ ] Verify that the operation is logged correctly

### 3. Reverse Mode Tests (Synced → Main)

#### 3.1 Role Addition
- [ ] Add a role with Sync ID 5 to a user in a synced server
- [ ] Verify that the role with Sync ID 5 is added to the user in the main server
- [ ] Verify that the operation is logged correctly

#### 3.2 Role Removal
- [ ] Remove a role with Sync ID 5 from a user in a synced server
- [ ] Verify that the role with Sync ID 5 is removed from the user in the main server only if the user doesn't have any other roles with Sync ID 5 in other synced servers
- [ ] Verify that the operation is logged correctly

#### 3.3 User Joins Main Server
- [ ] Have a user with a role with Sync ID 5 in a synced server join the main server
- [ ] Verify that the role with Sync ID 5 is added to the user in the main server
- [ ] Verify that the operation is logged correctly

#### 3.4 User Leaves Synced Server
- [ ] Have a user with a role with Sync ID 5 leave a synced server
- [ ] Verify that the role with Sync ID 5 is removed from the user in the main server only if the user doesn't have any other roles with Sync ID 5 in other synced servers
- [ ] Verify that the operation is logged correctly

### 4. Edge Cases

#### 4.1 Multiple Roles with Same Sync ID
- [ ] Configure multiple roles with the same Sync ID in a server
- [ ] Verify that all roles with the same Sync ID are synchronized correctly

#### 4.2 Role Hierarchy
- [ ] Test with roles that are higher in the hierarchy than the bot's role
- [ ] Verify that appropriate error messages are displayed and logged

#### 4.3 Missing Roles
- [ ] Test with a Sync ID that exists in the main server but not in a synced server
- [ ] Verify that the bot handles this case gracefully

#### 4.4 Permission Issues
- [ ] Test with a server where the bot doesn't have the Manage Roles permission
- [ ] Verify that appropriate error messages are displayed and logged

## Test Environment
- Main Server: [Server Name/ID]
- Synced Servers: [Server Names/IDs]
- Test Users: [User Names/IDs]

## Test Results
Document the results of each test case, including:
- Pass/Fail status
- Any issues encountered
- Screenshots or logs as evidence
- Recommendations for fixes or improvements
