import { ButtonInteraction, Client, GatewayIntentBits, Interaction, MessageFlags, ModalSubmitInteraction, Partials } from 'discord.js';
import buttons from './buttons';
import { config } from './config';
import events from './events';
import modals from './modals';
import { Database } from './shared/Database';
import { openRedisClient } from './shared/RedisClient';
import { Handler } from './types';
import { loadHandlersFrom, refreshCommands } from './utils';
import { initializeWebserver } from './webserver';
import { Encrypter } from './shared/Encrypter';
import tasks from './tasks';


let ready = false;

console.log('Starting...');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.GuildMember, Partials.User, Partials.Channel],

  rest: {
    version: '10'
  },

  allowedMentions: {
    parse: [],
    repliedUser: false
  },
});

const commands: Handler[] = [];
const contextMenus: Handler[] = [];

// Due to their reliance on each other, these two events (interactionCreate, and ready) have to stay here.
// Alternatively, they can move to another single file. Or use static classes.
client.on('interactionCreate', async (interaction: Interaction) => {
  if (!ready) {
    if (
      interaction.isChatInputCommand()
      || interaction.isContextMenuCommand()
      || interaction.isButton()
      || interaction.isModalSubmit()
    )
      await interaction.reply({
        content: 'Bot is still starting up. Please wait a few seconds.',
        flags: [MessageFlags.Ephemeral],
      });

    return;
  }

  if (interaction.isChatInputCommand()) {
    // Handle slash commands.
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
      if (button.id != id) continue;

      Promise.resolve((button.execute as (context: Client, interaction: ButtonInteraction, ...args: unknown[]) => Promise<void>)(client, interaction, ...interaction.customId.split('_').slice(1))
        .catch(e => console.error('An error occurred while handling a button interaction: ', e)));
      return;
    }
  } else if (interaction.isModalSubmit()) {
    // Handle modal submissions.
    const id = interaction.customId.split('_')[0];

    for (const modal of modals) {
      if (id != modal.id) continue;

      Promise.resolve((modal.execute as (context: Client, interaction: ModalSubmitInteraction, ...args: unknown[]) => Promise<void>)(client, interaction, ...interaction.customId.split('_').slice(1))
        .catch(e => console.error('An error occurred while handling a modal interaction: ', e)));
      return;
    }
  }
});

client.on('clientReady', async () => {
  console.log(`Logged in as ${client.user!.tag}!`);

  for (const guild of client.guilds.cache.values()) {
    if (guild.id != config.DISCORD_GUILD_ID) await guild.leave();
  }

  await loadHandlersFrom('commands', commands);
  await loadHandlersFrom('context-menus', contextMenus);

  await refreshCommands(client);

  Encrypter.initialize(config.DATABASE_SECRET!);
  await Database.open('./data/discord-main.db');
  await openRedisClient(config.REDIS_URL!, client);

  await initializeWebserver(client);

  tasks.forEach((task) => {
    const handler = () => {
      Promise.resolve(task.handle(client))
        .catch(e => console.error(`Error in '${task.id}' task:`, e));
    };

    if (task.firstRun) handler();
    setInterval(handler, task.interval);
  });

  events.forEach(event =>
    client.on(event.event, (...args) =>
      Promise.resolve((event.execute as (context: Client, ...args: unknown[]) => Promise<void>)(client, ...args))
        .catch(e => console.error(`Error in ${event.event} handler:`, e))
    )
  );

  ready = true;
  console.log('Bot marked as ready. Handlers can now accept interactions.');
});

client.on('error', console.error);
process.on('uncaughtException', console.error);

client.login(config.DISCORD_TOKEN);
