import { ApplicationIntegrationType, AutocompleteInteraction, ChatInputCommandInteraction, Client, InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Database } from '../shared/Database';
import { Command, KnowledgebaseItem } from '../types';

class CiteCommand implements Command<Client<boolean>> {
  data = new SlashCommandBuilder()
    .setName('cite')
    .setDescription('Cite content from the knowledgebase.')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(option =>
      option
        .setName('name')
        .setDescription('The name of the entry.')
        .setRequired(true)
        .setAutocomplete(true)
    );

  async handleCommand(context: Client<boolean>, interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inGuild()) return;
    await interaction.deferReply();

    try {
      const id = interaction.options.getInteger('name', true);

      const item = await Database.getFromKnowledgebase(id);
      if (!item) throw new Error('Knowledgebase item not found.');

      await interaction.editReply(item.content);
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }

  async handleAutocomplete(context: Client<boolean>, interaction: AutocompleteInteraction): Promise<void> {
    if (!interaction.inGuild()) return;

    const items: KnowledgebaseItem[] = await Database.getAllKnowledgebaseItems(interaction.guildId);
    const value = interaction.options.getFocused();

    const toRespond = items.filter(i => !value ? true : i.content.includes(value));
    if (toRespond.length > 25) toRespond.length = 25;

    await interaction.respond(
      toRespond.map(p => ({
        name: p.name,
        value: p.id,
      }))
    );
  }
}

export default new CiteCommand();
