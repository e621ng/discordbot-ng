import { Client, ContextMenuCommandBuilder, SlashCommandBuilder } from 'discord.js';
import { Handler } from './handler';

export type CommandBuilder = ContextMenuCommandBuilder | SlashCommandBuilder;

export interface Command extends Handler {
  data: CommandBuilder | ((client: Client) => Promise<CommandBuilder>);
  guilds?: string[];
}