import { ChatInputCommandInteraction, ContextMenuCommandBuilder, ContextMenuCommandInteraction, SlashCommandBuilder } from 'discord.js';

export interface Command<Context> {
  data: ContextMenuCommandBuilder | SlashCommandBuilder;
  execute(context: Context, interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction): Promise<void>;
}
