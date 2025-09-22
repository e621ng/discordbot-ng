import { Client, MessageFlags, ModalSubmitInteraction } from 'discord.js';
import { Database } from '../shared/Database';
import { deferInteraction, logCustomEvent } from '../utils';

export default {
  name: 'edit-knowledgebase-item-modal',
  handler: async function (client: Client, interaction: ModalSubmitInteraction, idString: string) {
    if (!interaction.guild) return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Must be ran in guild.' });

    await deferInteraction(interaction);

    const id = parseInt(idString);
    const content = interaction.fields.getTextInputValue('content');

    const existingItem = await Database.getFromKnowledgebase(id);

    if (!existingItem) return interaction.editReply('Knowledgebase item not found.');

    if (content.length > 2000) return interaction.editReply('Content cannot be over 2000 characters long.');

    logCustomEvent(interaction.guild!, {
      title: 'Knowledgebase Item Edited',
      description: null,
      color: 0xFFFF00,
      timestamp: new Date(),
      fields: [
        {
          name: 'User',
          value: `<@${interaction.user.id}>\n${interaction.user.username}`,
          inline: true
        },
        {
          name: 'Name',
          value: existingItem.name,
          inline: true
        },
        {
          name: 'Old Content',
          value: existingItem.content,
          inline: true
        },
        {
          name: 'New Content',
          value: content,
          inline: true
        }
      ]
    });

    await Database.editKnowledgebaseItem(id, content);

    return interaction.editReply(`Edited knowledgebase entry \`${existingItem.name}\`.`);
  }
};