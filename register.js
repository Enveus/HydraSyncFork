import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { PermissionFlagsBits } from "discord-api-types/v10";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
var config = require('./config.json')

// Helper function to get default permissions
const getDefaultPermissions = () => {
  // If allowedRoleId is not set, default to server administrators only
  return config.allowedRoleId ? "0" : PermissionFlagsBits.Administrator.toString();
};

const commands = [{
  name: 'add',
  description: 'Will add the role to the user in both servers.',
  default_member_permissions: getDefaultPermissions(),
  options: [{
        "name": "role",
        "description": "The role to add in both servers",
        "type": 8,
        "required": true
    },
    {
        "name": "user",
        "description": "The user to add the role to in both servers",
        "type": 6,
        "required": true
    }]
}, {
    name: 'remove',
    description: 'Will remove the role from the user in both servers.',
    default_member_permissions: getDefaultPermissions(),
    options: [{
          "name": "role",
          "description": "The role to remove in both servers",
          "type": 8,
          "required": true
      },
      {
          "name": "user",
          "description": "The user to remove the role to in both servers",
          "type": 6,
          "required": true
      }]
  }, {
    "name": "role-checker",
    "type": 1,
    "description": "A role checker to compare roles between the main server and synced servers.",
    "default_member_permissions": getDefaultPermissions(),
    "options": [
        {
            "name": "option",
            "description": "Analyze sends a DM with the differences, force-sync will apply the changes shown in the analysis",
            "type": 3,
            "required": true,
            "choices": [
                {
                    "name": "analyze",
                    "value": "analyze"
                },
                {
                    "name": "force-sync",
                    "value": "force"
                }
            ]
        }
    ]
}]; 

const rest = new REST({ version: '9' }).setToken(config.token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(config.applicationId, config.mainServer),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();
