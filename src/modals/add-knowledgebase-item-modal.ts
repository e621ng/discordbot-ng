import { Client, MessageFlags, ModalSubmitInteraction } from 'discord.js';
import { Database } from '../shared/Database';
import { deferInteraction, logCustomEvent } from '../utils';

export default {
  name: 'add-knowledgebase-item-modal',
  handler: async function (client: Client, interaction: ModalSubmitInteraction) {
    if (!interaction.guild) return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Must be ran in guild.' });

    await deferInteraction(interaction);

    const name = interaction.fields.getTextInputValue('name');
    const content = interaction.fields.getTextInputValue('content');

    if (content.length > 2000) return interaction.editReply('Content cannot be over 2000 characters long.');

    const existingItem = await Database.getFromKnowledgebaseByName(interaction.guild.id, name);

    if (existingItem) return interaction.editReply(`Knowledgebase item ${name} already exists!`);

    logCustomEvent(interaction.guild!, {
      title: 'Knowledgebase Item Added',
      description: null,
      color: 0x00FF00,
      timestamp: new Date(),
      fields: [
        {
          name: 'User',
          value: `<@${interaction.user.id}>\n${interaction.user.username}`,
          inline: true
        },
        {
          name: 'Name',
          value: name,
          inline: true
        },
        {
          name: 'Content',
          value: content,
          inline: true
        }
      ]
    });

    await Database.addToKnowledgebase(interaction.guild.id, name, content);

    return interaction.editReply('Knowledge expanded.');
  }
};