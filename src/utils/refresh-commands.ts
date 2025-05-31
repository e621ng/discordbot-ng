import { Client, REST, Routes } from 'discord.js';
import { config } from '../config';
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import fs from 'fs';
import { Command } from '../types';
import path from 'path';

const ROOT_DIR = path.resolve(__dirname, '..');

const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN!);

export async function refreshCommands(client: Client) {
  try {
    const commands: RESTPostAPIApplicationCommandsJSONBody[] = [];
    const guildCommands: { [id: string]: RESTPostAPIApplicationCommandsJSONBody[] } = {};
    const commandFiles = {
      commands: fs.readdirSync(`${ROOT_DIR}/commands`).filter(file => file.endsWith('.js') || file.endsWith('.ts')),
      'context-menus': fs.readdirSync(`${ROOT_DIR}/context-menus`).filter(file => file.endsWith('.js') || file.endsWith('.ts')),
    };

    for (const [folderName, files] of Object.entries(commandFiles)) {
      for (const file of files) {
        const p = `${ROOT_DIR}/${folderName}/${file}`;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const command: Command = require(p).default;

        if (!command) {
          console.warn(`File at ${p} has no export. Skipping registering.`);
          continue;
        }

        let data: RESTPostAPIApplicationCommandsJSONBody;
        if (typeof (command.data) == 'function') {
          data = (await command.data(client)).toJSON();
        } else {
          data = command.data.toJSON();
        }

        if (!command.guilds) {
          commands.push(data);
        } else {
          for (const id of command.guilds) {
            if (!guildCommands[id]) guildCommands[id] = [];
            guildCommands[id].push(data);
          }
        }
      }
    }

    console.log('Started refreshing application (/) commands.');

    console.log('Global commands: ' + commands.length);
    await rest.put(
      Routes.applicationCommands(config.DISCORD_CLIENT_ID!),
      { body: commands }
    );

    for (const guild in guildCommands) {
      console.log('Guild commands: ' + guildCommands[guild].length + ' (' + guild + ')');
      await rest.put(
        Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID!, guild),
        { body: guildCommands[guild] }
      );
    }

    console.log('Successfully reloaded application (/) commands.');
  } catch (error: any) {
    console.error(error);
    console.error(JSON.stringify(error.requestBody, null, 4));
  }
};