import { ActionRowBuilder, ApplicationIntegrationType, AutocompleteInteraction, ChatInputCommandInteraction, Client, InteractionContextType, MessageFlags, ModalBuilder, PermissionFlagsBits, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { Database } from '../shared/Database';
import { KnowledgebaseItem } from '../types';
import { deferInteraction, logCustomEvent } from '../utils';

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
    ),
  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Must be ran in guild.' });

    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand == 'add') {
      const modal = new ModalBuilder()
        .setCustomId('add-knowledgebase-item-modal')
        .setTitle('Add to knowledgebase');

      const name = new TextInputBuilder()
        .setCustomId('name')
        .setLabel('Knowledgebase item name')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(300);

      const content = new TextInputBuilder()
        .setCustomId('content')
        .setLabel('Item content')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(2000);

      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(name));
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(content));

      return await interaction.showModal(modal);
    } else if (subcommand == 'remove') {
      await deferInteraction(interaction);
      const id = interaction.options.getInteger('name', true);

      const item = await Database.getFromKnowledgebase(id);

      if (!item) return interaction.editReply('Knowledgebase item not found.');

      logCustomEvent(interaction.guild!, {
        title: 'Knowledgebase Item Removed',
        description: null,
        color: 0xFF0000,
        timestamp: new Date(),
        fields: [
          {
            name: 'User',
            value: `<@${interaction.user.id}>\n${interaction.user.username}`,
            inline: true
          },
          {
            name: 'Name',
            value: item.name,
            inline: true
          },
          {
            name: 'Content',
            value: item.content,
            inline: true
          }
        ]
      });

      await Database.removeFromKnowledgebase(id);

      return interaction.editReply(`Removed knowledgebase entry \`${item.name}\`.`);
    } else if (subcommand == 'edit') {
      const id = interaction.options.getInteger('name', true);

      const existingItem = await Database.getFromKnowledgebase(id);

      if (!existingItem) return interaction.editReply('Knowledgebase item not found.');

      const modal = new ModalBuilder()
        .setCustomId(`edit-knowledgebase-item-modal_${id}`)
        .setTitle(`Editing knowledgebase item ${existingItem.name.slice(0, 18)}`);

      const content = new TextInputBuilder()
        .setCustomId('content')
        .setLabel('New content')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(2000);

      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(content));

      return await interaction.showModal(modal);
    }
  },
  autoComplete: async function (client: Client, interaction: AutocompleteInteraction) {
    if (!interaction.guild) return interaction.respond([]);

    const items: KnowledgebaseItem[] = await Database.getAllKnowledgebaseItems(interaction.guild.id);

    const value = interaction.options.getFocused();

    const toRespond = items.filter(i => !value ? true : i.name.includes(value));
    if (toRespond.length > 25) toRespond.length = 25;

    interaction.respond(toRespond.map(p => ({
      name: p.name,
      value: p.id
    })));
  }
};