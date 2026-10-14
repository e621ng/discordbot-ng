import { Client, ModalSubmitInteraction } from 'discord.js';
import { Database } from '../shared/Database';
import { deferInteraction, logCustomEvent } from '../utils';
import { Modal } from '../types';

class EditKnowledgebaseItemModal implements Modal<Client> {
  id = 'edit-knowledgebase-item-modal';

  async execute(context: Client<boolean>, interaction: ModalSubmitInteraction, idString: string): Promise<void> {
    if (!interaction.inGuild()) return;
    await deferInteraction(interaction);

    try {
      const id = parseInt(idString);
      const existing = await Database.getFromKnowledgebase(id);
      if (!existing) throw new Error("A knowledgebase item with that ID doesn't exist.");

      const content = interaction.fields.getTextInputValue('content');
      if (content.length > 2000) throw new Error('Content cannot be longer than 2000 characters.');

      await logCustomEvent(interaction.guild!, {
        title: 'Knowledgebase Item Edited',
        description: null,
        color: 0xFFFF00,
        timestamp: new Date(),
        fields: [
          { name: 'User', value: `${interaction.user} (${interaction.user.id})`, inline: false },
          { name: 'Name', value: existing.name, inline: false },
          { name: 'Old Content', value: existing.content, inline: false },
          { name: 'New Content', value: content, inline: false },
        ],
      });

      await Database.editKnowledgebaseItem(id, content);
      await interaction.editReply({ content: `\`${existing.name}\` has been edited.` });
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }
}

export default new EditKnowledgebaseItemModal();