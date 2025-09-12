import { ApplicationIntegrationType, AutocompleteInteraction, BitFieldResolvable, ChatInputCommandInteraction, Client, GuildBasedChannel, GuildMember, InteractionContextType, MessageFlags, MessageMentions, PermissionFlagsBits, SlashCommandBuilder, time, TimestampStyles } from 'discord.js';
import { deferInteraction } from '../utils';
import { Database } from '../shared/Database';
import { KnowledgebaseItem } from '../types';

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
    if (!interaction.guild) return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Must be ran in guild.' });

    await interaction.deferReply();

    const id = interaction.options.getInteger('name', true);

    const item = await Database.getFromKnowledgebase(id);

    if (!item) return interaction.editReply('Knowledgebase item not found.');

    return interaction.editReply(item.content);
  },
  autoComplete: async function (client: Client, interaction: AutocompleteInteraction) {
    if (!interaction.guild) return interaction.respond([]);

    const items: KnowledgebaseItem[] = await Database.getAllKnowledgebaseItems(interaction.guild.id);

    const value = interaction.options.getFocused();

    const toRespond = items.filter(i => !value ? true : i.content.includes(value));
    if (toRespond.length > 25) toRespond.length = 25;

    interaction.respond(toRespond.map(p => ({
      name: p.name,
      value: p.id
    })));
  }
};