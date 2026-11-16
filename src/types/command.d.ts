import { AutocompleteInteraction, ChatInputCommandInteraction, ContextMenuCommandBuilder, ContextMenuCommandInteraction, SlashCommandBuilder } from 'discord.js';

export interface Command<Context> {
  data: ContextMenuCommandBuilder | SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;

  // Functions.
  handleAutocomplete?(context: Context, interaction: AutocompleteInteraction): Promise<void>;
  handleCommand(context: Context, interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction): Promise<void>;
}
