import { Client, ModalSubmitInteraction } from 'discord.js';
import { Database } from '../shared/Database';
import { deferInteraction, logCustomEvent } from '../utils';
import { Modal } from '../types';

class AddNoteModal implements Modal<Client> {
  id = 'add-note-modal';

  async execute(context: Client<boolean>, interaction: ModalSubmitInteraction, id: string): Promise<void> {
    if (!interaction.inGuild()) return;
    await deferInteraction(interaction);

    try {
      const message = interaction.fields.getTextInputValue('note-message');
      const guild = await context.guilds.fetch(interaction.guildId);
      const user = await context.users.fetch(id);

      await logCustomEvent(guild, {
        title: 'Note Added',
        description: null,
        color: 0x00FF00,
        timestamp: new Date(),
        fields: [
          { name: 'Moderator', value: `${interaction.user} (${interaction.user.id})`, inline: false },
          { name: 'User', value: `${user.username} (${user.id})`, inline: false },
          { name: 'Note', value: message, inline: false },
        ],
      });

      await Database.putNote(id, message, interaction.user.id);
      await interaction.editReply({ content: 'Note added.' });
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }
}

export default new AddNoteModal();