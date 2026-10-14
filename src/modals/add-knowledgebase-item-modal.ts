import { Client, ModalSubmitInteraction } from 'discord.js';
import { Database } from '../shared/Database';
import { Modal } from '../types';
import { deferInteraction, logCustomEvent } from '../utils';

class AddKnowledgebaseItemModal implements Modal<Client> {
  id = 'add-knowledgebase-item-modal';

  async execute(context: Client<boolean>, interaction: ModalSubmitInteraction): Promise<void> {
    if (!interaction.inGuild()) return;
    await deferInteraction(interaction);

    try {
      const name = interaction.fields.getTextInputValue('name');
      const content = interaction.fields.getTextInputValue('content');
      if (content.length > 2000) throw new Error('Content cannot be longer than 2000 characters.');

      const existing = await Database.getFromKnowledgebaseByName(interaction.guildId, name);
      if (existing) throw new Error(`A knowledgebase item under \`${name}\` already exists.`);

      await logCustomEvent(interaction.guild!, {
        title: 'Knowledgebase Item Added',
        description: null,
        color: 0x00FF00,
        timestamp: new Date(),
        fields: [
          { name: 'User', value: `${interaction.user} (${interaction.user.id})`, inline: false },
          { name: 'Name', value: name, inline: false },
          { name: 'Content', value: content, inline: false },
        ],
      });

      await Database.addToKnowledgebase(interaction.guildId, name, content);
      await interaction.editReply(`\`${name}\` has been added to the knowledgebase.`);
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }
}

export default new AddKnowledgebaseItemModal();