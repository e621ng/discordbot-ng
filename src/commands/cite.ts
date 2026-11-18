import { ApplicationIntegrationType, AutocompleteInteraction, ChatInputCommandInteraction, Client, InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Database } from '../shared/Database';
import { SetSeverity } from '../utils';

export default {
  name: 'cite',
  data: new SlashCommandBuilder()
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
    ),

  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild()) return;
    await interaction.deferReply();

    const item = await Database.getFromKnowledgebase(interaction.options.getInteger('name', true));
    if (!item) {
      await interaction.editReply({
        embeds: [{
          ...SetSeverity('warning'),
          description: "The knowledgebase item you asked for doesn't exist.",
        }],
      });

      return;
    }

    await interaction.editReply({
      embeds: [{
        ...SetSeverity('info'),
        title: item.name.slice(0, 256),
        description: item.content,
      }],
    });
  },

  autoComplete: async function (client: Client, interaction: AutocompleteInteraction) {
    if (!interaction.inGuild()) return await interaction.respond([]);

    const items = await Database.getAllKnowledgebaseItems(interaction.guildId);
    const value = interaction.options.getFocused();

    const toRespond = items.filter(i => !value ? true : i.name.includes(value));
    if (toRespond.length > 25) toRespond.length = 25;

    await interaction.respond(
      toRespond.map(p => ({
        name: p.name.slice(0, 100),
        value: p.id
      }))
    );
  }
};
