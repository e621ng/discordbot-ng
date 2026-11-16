import { Client, RESTPostAPIApplicationCommandsJSONBody, Routes } from 'discord.js';
import commands from '../commands';
import { config } from '../config';

export async function refreshCommands(client: Client) {
  try {
    const deployable: RESTPostAPIApplicationCommandsJSONBody[] = [];
    for (const command of commands) deployable.push(command.data.toJSON());

    await client.rest.put(Routes.applicationCommands(config.DISCORD_CLIENT_ID!), {
      body: deployable
    });

    console.log('Successfully deployed application (/) commands.');
  } catch (error: any) {
    console.error(error);
    console.error(JSON.stringify(error.requestBody, null, 4));
  }
};
