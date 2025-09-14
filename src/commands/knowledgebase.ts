import { ApplicationIntegrationType, AutocompleteInteraction, ChatInputCommandInteraction, Client, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Database } from '../shared/Database';
import { KnowledgebaseItem } from '../types';
import { deferInteraction } from '../utils';

export default {
  name: 'knowledgebase',
  data: new SlashCommandBuilder()
    .setName('knowledgebase')
    .setDescription('Access the compendium of knowledge.')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add to the knowledgebase.')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('The name of the entry.')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('content')
            .setDescription('The content of the entry.')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Purge knowledge from the universe.')
        .addIntegerOption(option =>
          option
            .setName('name')
            .setDescription('The name of the entry to remove.')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('edit')
        .setDescription('Edit a knowledgebase entry.')
        .addIntegerOption(option =>
          option
            .setName('name')
            .setDescription('The name of the entry to edit.')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('content')
            .setDescription('The new content of the entry.')
            .setRequired(true)
        )
    ),
  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Must be ran in guild.' });

    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand == 'add') {
      await deferInteraction(interaction);

      const name = interaction.options.getString('name', true);
      const content = interaction.options.getString('content', true);

      const existingItem = await Database.getFromKnowledgebaseByName(interaction.guild.id, name);

      if (existingItem) return interaction.editReply(`Knowledgebase item ${name} already exists!`);

      await Database.addToKnowledgebase(interaction.guild.id, name, content);

      return interaction.editReply('Knowledge expanded.');
    } else if (subcommand == 'remove') {
      await deferInteraction(interaction);
      const id = interaction.options.getInteger('name', true);

      const item = await Database.getFromKnowledgebase(id);

      if (!item) return interaction.editReply('Knowledgebase item not found.');

      await Database.removeFromKnowledgebase(id);

      return interaction.editReply('Knowledge removed.');
    } else if (subcommand == 'edit') {
      await deferInteraction(interaction);

      const id = interaction.options.getInteger('name', true);
      const content = interaction.options.getString('content', true);

      const existingItem = await Database.getFromKnowledgebase(id);

      if (!existingItem) return interaction.editReply('Knowledgebase item not found.');

      await Database.editKnowledgebaseItem(id, content);

      return interaction.editReply('Information exchange completed.');
    }
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