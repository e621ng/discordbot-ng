import { ApplicationIntegrationType, AutocompleteInteraction, ChatInputCommandInteraction, Client, InteractionContextType, MessageFlags, ModalBuilder, PermissionFlagsBits, SlashCommandBuilder, TextInputStyle } from 'discord.js';
import { Database } from '../shared/Database';
import { Command, KnowledgebaseItem } from '../types';
import { createTextInput, logCustomEvent, SetSeverity } from '../utils';

async function handleKnowledgebaseAdd(context: Client<boolean>, interaction: ChatInputCommandInteraction) {
  const modal = new ModalBuilder()
    .setCustomId('add-knowledgebase-item-modal')
    .setTitle('Add to Knowledgebase');

  const nameLabel = createTextInput('name', 'Item Name', null, true, TextInputStyle.Short, 300, 1);
  const contentLabel = createTextInput('content', 'Item Content', null, true, TextInputStyle.Paragraph, 2000, 1);
  modal.addLabelComponents(nameLabel, contentLabel);

  await interaction.showModal(modal);
}

async function handleKnowledgebaseEdit(context: Client<boolean>, interaction: ChatInputCommandInteraction) {
  const id = interaction.options.getInteger('name', true);

  const item = await Database.getFromKnowledgebase(id);
  if (!item) throw new Error('No knowledgebase item was found with that ID.');

  const modal = new ModalBuilder()
    .setCustomId(`edit-knowledgebase-item-modal_${id}`)
    .setTitle(`Editing knowledgebase item ${item.name.slice(0, 18)}`);

  const contentLabel = createTextInput('content', 'New Content', null, true, TextInputStyle.Paragraph, 2000, 1);
  modal.addLabelComponents(contentLabel);

  await interaction.showModal(modal);
}

async function handleKnowledgebaseRemove(context: Client<boolean>, interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const id = interaction.options.getInteger('name', true);

  const item = await Database.getFromKnowledgebase(id);
  if (!item) throw new Error('No knowledgebase item was found with that ID.');

  const guild = await context.guilds.fetch(interaction.guildId!);
  await logCustomEvent(guild, {
    title: 'Knowledgebase Item Removed',
    description: null,
    color: 0xFF0000,
    timestamp: new Date(),
    fields: [
      { name: 'User', value: `${interaction.user.username} (${interaction.user.tag})`, inline: true },
      { name: 'Name', value: item.name, inline: true },
      { name: 'Content', value: item.content, inline: true }
    ]
  });

  await Database.removeFromKnowledgebase(id);
  await interaction.reply({
    embeds: [{
      ...SetSeverity('success'),
      description: `The knowledgebase entry for \`${item.name}\` has been removed.`
    }],
  });
}

class KnowledgebaseCommand implements Command<Client<boolean>> {
  data = new SlashCommandBuilder()
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
    );

  async handleAutocomplete(context: Client<boolean>, interaction: AutocompleteInteraction): Promise<void> {
    if (!interaction.inGuild()) return;

    const items: KnowledgebaseItem[] = await Database.getAllKnowledgebaseItems(interaction.guildId);
    const value = interaction.options.getFocused();

    const toRespond = items.filter(i => !value ? true : i.name.includes(value));
    if (toRespond.length > 25) toRespond.length = 25;

    await interaction.respond(
      toRespond.map(p => ({
        name: p.name,
        value: p.id
      }))
    );
  }

  async handleCommand(context: Client<boolean>, interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inGuild()) return;

    try {
      switch (interaction.options.getSubcommand(true)) {
        case 'add': return await handleKnowledgebaseAdd(context, interaction);
        case 'edit': return await handleKnowledgebaseEdit(context, interaction);
        case 'remove': return await handleKnowledgebaseRemove(context, interaction);
      }
    } catch (error: Error | any) {
      await interaction.reply({ content: error.message }).catch(() => {});
    }
  }
}

export default new KnowledgebaseCommand();
