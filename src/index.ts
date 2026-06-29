import { Client as DiscordClient, GatewayIntentBits, MessageFlags, Partials } from 'discord.js';
import { config } from './config';
import { handleAuditLogCreate, handleBanRemove, handleBulkMessageDelete, handleGuildCreate, handleMemberJoin, handleMessageCreate, handleMessageDelete, handleMessageUpdate, handleThreadCreate, handleVoiceStateUpdate } from './events';
import { ScheduledTasks, Scheduler } from './scheduler';
import { Database } from './shared/Database';
import { openRedisClient } from './shared/RedisClient';
import { Handler } from './types';
import { initIfNecessary, loadHandlersFrom, refreshCommands } from './utils';
import { initializeWebserver } from './webserver';
import { Encrypter } from './shared/Encrypter';

let ready = false;

console.log('Starting...');

const client = new DiscordClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.GuildMember, Partials.User, Partials.Channel],
  rest: { timeout: 30000 },
  allowedMentions: {
    parse: [],
    repliedUser: false
  }
});

const scheduler: Scheduler = new Scheduler(client);

const commands: Handler[] = [];
const contextMenus: Handler[] = [];
const buttons: Handler[] = [];
const modals: Handler[] = [];
const menus: Handler[] = [];

// Due to their reliance on each other, these two events (interactionCreate, and ready) have to stay here.
// Alternatively, they can move to another single file. Or use static classes.
client.on('interactionCreate', async (interaction) => {
  if (!ready) {
    if (
      interaction.isChatInputCommand()
      || interaction.isContextMenuCommand()
      || interaction.isButton()
      || interaction.isModalSubmit()
      || interaction.isAnySelectMenu()
    )
      interaction.reply({
        content: 'Bot is still starting up. Please wait a few seconds.',
        flags: [MessageFlags.Ephemeral],
      });

    return;
  }

  if (interaction.isChatInputCommand()) {
    // Handle chat
    for (const command of commands) {
      if (interaction.commandName == command.name) {
        command.handler(client, interaction);
        return;
      }
    }
  } else if (interaction.isContextMenuCommand()) {
    // Handle context menu commands.
    for (const command of contextMenus) {
      if (interaction.commandName == command.name) {
        command.handler(client, interaction);
        return;
      }
    }
  } else if (interaction.isAutocomplete()) {
    // Handle autocomplete requests.
    for (const command of commands) {
      if (interaction.commandName == command.name) {
        if (command.autoComplete) {
          command
            .autoComplete(client, interaction)
            .catch(e => console.error(e));
        }
        return;
      }
    }
  } else if (interaction.isButton()) {
    // Handle button presses.
    const id = interaction.customId.split('_')[0];

    for (const button of buttons) {
      if (id == button.name) {
        button.handler(client, interaction, ...interaction.customId.split('_').slice(1));
        return;
      }
    }
  } else if (interaction.isModalSubmit()) {
    // Handle modal submissions.
    const id = interaction.customId.split('_')[0];

    for (const modal of modals) {
      if (id == modal.name) {
        modal.handler(client, interaction, ...interaction.customId.split('_').slice(1));
        return;
      }
    }
  } else if (interaction.isAnySelectMenu()) {
    // Handle menu selections.
    const id = interaction.customId.split('_')[0];

    for (const menu of menus) {
      if (id == menu.name) {
        menu.handler(client, interaction, ...interaction.customId.split('_').slice(1));
        return;
      }
    }
  }
});

client.on('clientReady', async () => {
  console.log(`Logged in as ${client.user!.tag}!`);

  await loadHandlersFrom('commands', commands);
  await loadHandlersFrom('context-menus', contextMenus);
  await loadHandlersFrom('buttons', buttons);
  await loadHandlersFrom('modals', modals);
  await loadHandlersFrom('menus', menus);

  await refreshCommands(client);

  await initIfNecessary(client, commands);
  await initIfNecessary(client, buttons);
  await initIfNecessary(client, modals);
  await initIfNecessary(client, menus);

  Encrypter.initialize(config.DATABASE_SECRET!);
  await Database.open('./data/discord-main.db');
  await openRedisClient(config.REDIS_URL!, client);

  await initializeWebserver(client);

  ScheduledTasks.forEach(task => scheduler.add(task));

  client.on('guildAuditLogEntryCreate', handleAuditLogCreate);
  client.on('guildBanRemove', handleBanRemove);
  client.on('guildCreate', handleGuildCreate);
  client.on('guildMemberAdd', handleMemberJoin);
  client.on('messageCreate', handleMessageCreate);
  client.on('messageDelete', handleMessageDelete);
  client.on('messageDeleteBulk', handleBulkMessageDelete);
  client.on('messageUpdate', handleMessageUpdate);
  client.on('threadCreate', handleThreadCreate);
  client.on('voiceStateUpdate', handleVoiceStateUpdate);

  ready = true;
  console.log('Ready');
});


client.on('error', console.error);
process.on('uncaughtException', console.error);

client.login(config.DISCORD_TOKEN);
