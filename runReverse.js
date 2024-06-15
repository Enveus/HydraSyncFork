/* 
    syncBot, a super simple bot that gives you the ability to add/remove a role of a 
    member in two servers at the same time.
*/

// Use cases:
// 1. User role is added in a synced server manually, if the user exists in the main server, any role with the same name will be applied in the main server
// 2. User role is added via slash command in a synced server, if the user exists in the main server, the bot will apply the role with the same name in the main server
// 3. User role is removed in a synced server manually, any role with the same name is removed from the user in the main server
// 4. User role is removed via slash command in a synced server, any role with the same name is removed from the user in the main server
// 5. User is added to the main server, roles that match names of roles the user has in any synced server are applied to the user in the main server
// 6. User is removed from a synced server, role names that the user has in the synced server are removed from the main server
import { createRequire } from "module";
const require = createRequire(import.meta.url);
var config = require("./config.json");
import { Client, GatewayIntentBits } from "discord.js";
import { iterateThroughMembers } from "./helpers.js";
const axios = require("axios");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});

// This is to keep the action from firing twice when using the (/) command, since the guildMemberUpdate will see the role update and fire the add/remove again.
let triggeredByIntention = false;

client.on("ready", () => {
  //TODO: Add validation of the config file
  console.log(`syncbot ready!`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const verified = await verifyUser(interaction.member.id);

  if (!verified) {
    await interaction.reply({content: `You don't have the necessary role to send that command, ${interaction.user.username}`, ephemeral: true});
    return;
  }

  await interaction.deferReply();

  try {

    triggeredByIntention = true;

    if (interaction.commandName === "add") {
      await handleAddRoleInteraction(interaction, interaction.options.getMember("user"), interaction.options.getRole("role").id);
    } else if (interaction.commandName === "remove") {
      await handleRemoveRoleInteraction(interaction, interaction.options.getMember("user"), interaction.options.getRole("role").id);
    } else if (interaction.commandName === "role-checker") {
      let option = interaction.options.data.find(
        (obj) => obj.name === "option"
      ).value;
      await iterateThroughMembers(interaction, roleAnalyze, roleAnalyzeCallback, option === "force" ? true : false);
    }
  } catch (error) {
    console.log(error);
    await interaction.editReply({content: "An internal error occurred while executing your command.", ephemeral: true});
  } finally {
    throttleUpdate();
  }
  
});

let roleAnalyze = async (member, interaction, data, forceSync = false) => {
  let memberMainserverRolesCollection = member.roles.cache;
  let memberMainServerRolesArrayStrings = memberMainserverRolesCollection.map(role => role.name);
  let memberObj = {
    username: member.displayName,
    serversWithDifferingRoles: [],
  };
  let hasDifferingRoles = false;

  for (const server of config.syncedServers) {
    const fetchedServer = await client.guilds.fetch(server);
    const fetchedServerRoles = await fetchedServer.roles.fetch();
    if (fetchedServer.ownerId === interaction.member.id) {
      let membersInFetchedServer = await fetchedServer.members.fetch();
      let memberInFetchedServer = membersInFetchedServer.get(member.id);
      if (memberInFetchedServer) {
        let membersRolesInFetchedServer = memberInFetchedServer.roles.cache;
        let membersRolesInFetchedServerAsStrings =
          membersRolesInFetchedServer.map((role) => role.name);
        // Roles that need removed from the user in the fetched server to match the roles the user has in the main server
        let rolesCollectionToRemoveInThisServer =
          membersRolesInFetchedServer.filter(
            (r) => !memberMainServerRolesArrayStrings.includes(r.name)
          );
        // Roles that need added to the user in the fetched server to match the roles the user has in the main server
        let rolesCollectionToAddInThisServer = memberMainserverRolesCollection
          .filter((r) => !membersRolesInFetchedServerAsStrings.includes(r.name))
          // must map the role over to the one in synced server for add
          .map(
            (role) =>
              fetchedServerRoles.find((r) => r.name === role.name) || role
          );

        let rolesToRemoveInThisServer = [
          ...rolesCollectionToRemoveInThisServer.values(),
        ];
        let rolesToAddInThisServer = [
          ...rolesCollectionToAddInThisServer.values(),
        ];
        if (
          rolesToRemoveInThisServer.length > 0 ||
          rolesToAddInThisServer.length > 0
        ) {
          hasDifferingRoles = true;
          let remove = forceSync
            ? "rolesRemovedToMatchMainserver"
            : "rolesToRemoveToMatchMainserver";
          let add = forceSync
            ? "rolesAddedToMatchMainserver"
            : "rolesToAddToMatchMainServer";
          if (
            rolesToRemoveInThisServer.length > 0 &&
            rolesToAddInThisServer.length === 0
          ) {
            if (forceSync) {
              memberInFetchedServer.roles.remove(
                rolesCollectionToRemoveInThisServer
              );
            }

            memberObj.serversWithDifferingRoles.push({
              serverName: fetchedServer.name,
              [`${remove}`]: rolesToRemoveInThisServer.map((role) => role.name),
            });
          }
          if (
            rolesToAddInThisServer.length > 0 &&
            rolesToRemoveInThisServer.length === 0
          ) {
            if (forceSync) {
              memberInFetchedServer.roles.add(rolesCollectionToAddInThisServer);
            }

            memberObj.serversWithDifferingRoles.push({
              serverName: fetchedServer.name,
              [`${add}`]: rolesToAddInThisServer.map((role) => role.name),
            });
          }
          if (
            rolesToAddInThisServer.length > 0 &&
            rolesToRemoveInThisServer.length > 0
          ) {
            if (forceSync) {
              await memberInFetchedServer.roles.remove(
                rolesCollectionToRemoveInThisServer
              );
              await memberInFetchedServer.roles.add(
                rolesCollectionToAddInThisServer
              );
            }

            memberObj.serversWithDifferingRoles.push({
              serverName: fetchedServer.name,
              [`${remove}`]: rolesToRemoveInThisServer.map((role) => role.name),
              [`${add}`]: rolesToAddInThisServer.map((role) => role.name),
            });
          }
        }
      }
    }
  }

  if (hasDifferingRoles) {
    data.membersWithDifferences.push(memberObj);
  }

  data.membersAnalyzed++;

  return data;
};

/**
 *
 * @param {the interaction from the original command} interaction
 * @param {the data procured by running the action on each member} data
 * @param {whether we are just analyzing roles, or force syncing} forceSync
 */
let roleAnalyzeCallback = async (interaction, data, forceSync) => {
  try {
    const dmChannel = await interaction.user.createDM();
    const buf = Buffer.from(JSON.stringify(data, null, 4));

    await dmChannel.send({
      files: [
        {
          attachment: buf,
          name: `${interaction.guild.name}.json`,
        },
      ],
    });

    const verb = forceSync ? "synced" : "analyzed";
    await interaction.editReply({
      content: `I went through and ${verb} roles for ${data.membersAnalyzed} members. I sent you the results in a DM.`
    });
  } catch (error) {
    console.error('Error in roleAnalyzeCallback:', error);
    await interaction.editReply({
      content: "An error occurred while sending the results. Please check the bot's logs for more details.",
      ephemeral: true,
    });
  } finally {
    throttleUpdate();
  }
};

let addRoleToMember = async (member, roleId) => {
  try {
    const mainServer = await client.guilds.fetch(config.mainServer);
    const serverCommandWasInRoleToAdd = await member.guild.roles.fetch(roleId);

    const mainServerMember = await mainServer.members.fetch(member.id);
    const mainServerRoleToAdd = mainServer.roles.cache.find(r => r.name === serverCommandWasInRoleToAdd.name);

    await member.roles.add(serverCommandWasInRoleToAdd);
    await mainServerMember.roles.add(mainServerRoleToAdd);

    return { success: true, message: `Added ${mainServerRoleToAdd.name} to ${mainServerMember.user.username} in ${mainServer.name}` };
  } catch (err) {
    console.error(err);
    return { success: false, message: 'There was an error while adding the role.' };
  }
};

// Manual function registered to (/) slash command to add a role from a user in the synced server and main server
let handleAddRoleInteraction = async (interaction, member, roleId) => {
  try {
    const result = await addRoleToMember(member, roleId);

    if (result.success) {
      await interaction.editReply({ content: result.message });
    } else {
      await interaction.editReply({ content: result.message, ephemeral: true });
    }
  } catch (error) {
    console.error('handleAddRoleInteraction error:', error);
    await interaction.editReply({ content: 'An internal error occurred while executing your command.', ephemeral: true });
  } finally {
    throttleUpdate();
  }
};

let removeRoleFromMember = async (member, roleId) => {
  try {
    const mainServer = await client.guilds.fetch(config.mainServer);
    const mainServerRoles = await mainServer.roles.fetch();
    const serverCommandWasInRoleToRemove = member.roles.resolve(roleId);

    const mainServerMember = await mainServer.members.fetch(member.id);
    const mainServerRoleToRemove = mainServerRoles.find(r => r.name === serverCommandWasInRoleToRemove.name);

    await member.roles.remove(serverCommandWasInRoleToRemove);
    await mainServerMember.roles.remove(mainServerRoleToRemove);

    return { success: true, message: `Removed ${mainServerRoleToRemove.name} from ${mainServerMember.user.username} in ${mainServer.name}` };
  } catch (err) {
    console.error(err);
    return { success: false, message: 'There was an error while removing the role.' };
  }
};

// Manual function registered to (/) slash command to remove a role from a user in the synced server and main server
let handleRemoveRoleInteraction = async (interaction, member, roleId) => {
  try {
    const result = await removeRoleFromMember(member, roleId);

    if (result.success) {
      await interaction.editReply({ content: result.message });
    } else {
      await interaction.editReply({ content: result.message, ephemeral: true });
    }
  } catch (error) {
    console.error('handleRemoveRoleInteraction error:', error);
    await interaction.editReply({ content: 'An internal error occurred while executing your command.', ephemeral: true });
  } finally {
    throttleUpdate();
  }
};

let throttleUpdate = () => {
  if (!triggeredByIntention) return;
  setTimeout(() => {
    triggeredByIntention = false;
  }, 2000);
};

// Verifies that the user who sent the command has the designated commanderRole from the config file.
let verifyUser = async (id) => {
  try {
    const guild = await client.guilds.fetch(config.mainServer);
    const member = await guild.members.fetch(id);
    
    return (
      member.roles.cache.some(r => r.name === config.allowedRoleName) || guild.ownerId === member.id
    );
  } catch (err) {
    console.error(`VERIFYUSER_ERROR: ${err}`);
    return false;
  }
};

let logMessage = async (message) => {
  const mainServer = await client.guilds.fetch(config.mainServer);
  const logChannel = await mainServer.channels.fetch(config.logChannelId);
  logChannel.send(message);
}

// When a users roles are updated in a synced server, update them in the main server.
client.on("guildMemberUpdate", async (oldMember, newMember) => {
  if (!triggeredByIntention && config.syncedServers.includes(newMember.guild.id)) {
    let oldRoles = oldMember._roles;
    let newRoles = newMember._roles;
    let result = null;

    if (oldRoles.length > newRoles.length) {
      let roleToRemoveId = oldRoles.filter((id) => !newRoles.includes(id))[0];
      if (roleToRemoveId) {
        result = await removeRoleFromMember(newMember, oldMember.roles.cache.get(roleToRemoveId).id);
      }
    } else if (oldRoles.length < newRoles.length) {
      let roleToAddId = newRoles.filter((id) => !oldRoles.includes(id))[0];
      if (roleToAddId) {
        result = await addRoleToMember(newMember, roleToAddId);
      }
    }

    if (result && result.success) {
      await logMessage(result.message);
    }
  }
});

// When a new user joins the main server, then look for that users roles in the synced servers and apply them in the main server.
client.on("guildMemberAdd", async (addedMember) => {
  if (config.mainServer !== addedMember.guild.id) return;

  try {
    const mainServer = addedMember.guild;
    const mainServerRoles = await mainServer.roles.fetch();
    const logChannel = await mainServer.channels.fetch(config.logChannelId);

    for (const server of config.syncedServers) {
      try {
        const guildToSync = await client.guilds.fetch(server);
        const memberToSync = await guildToSync.members.fetch(addedMember.user.id);

        if (memberToSync) {
          const thisServerRoles = [...memberToSync.roles.cache.values()].filter(r => r.name !== "@everyone");

          if (thisServerRoles.length > 0) {
            for (const role of thisServerRoles) {
              const roleToAdd = mainServerRoles.find(r => r.name === role.name);
              if (roleToAdd) {
                await addedMember.roles.add(roleToAdd);
              }
            }

            await logChannel.send(`Syncing roles from server: ${guildToSync.name} for new member: ${addedMember.user.username}`);
          }
        }
      } catch (error) {
        console.error(`Error syncing with server ${server}:`, error);
      }
    }
  } catch (error) {
    console.error(`Error processing guildMemberAdd for ${addedMember.user.username}:`, error);
  }
});

// When a user leaves a synced server, then remove all of matching roles from the main server.
client.on("guildMemberRemove", async (removedMember) => {
  if (!config.syncedServers.includes(removedMember.guild.id)) return;

  try {
    const mainServer = await client.guilds.fetch(config.mainServer);
    const mainServerRoles = await mainServer.roles.fetch();
    const mainServerMember = await mainServer.members.fetch(removedMember.user.id);
    const logChannel = await mainServer.channels.fetch(config.logChannelId);

    const syncedServerMemberRoles = removedMember.roles.cache;

    if (mainServerMember) {
      for (const role of syncedServerMemberRoles.values()) {
        const roleToRemove = mainServerRoles.find(r => r.name === role.name && r.name !== "@everyone");

        if (roleToRemove) {
          await mainServerMember.roles.remove(roleToRemove);
          await logChannel.send(`Removing roles from: ${mainServerMember.user.username} in server: ${mainServer.name} since they left a synced server: ${removedMember.guild.name}`);
        }
      }
    } else {
      await logChannel.send(`Not removing roles from: ${removedMember.user.username} in main server since they aren't in the server.`);
    }
  } catch (error) {
    console.error(`Error processing guildMemberRemove for ${removedMember.user.username}:`, error);
  }
});

client.login(config.token);