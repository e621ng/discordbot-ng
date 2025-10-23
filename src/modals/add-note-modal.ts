import { Client, MessageFlags, ModalSubmitInteraction } from 'discord.js';
import { Database } from '../shared/Database';
import { logCustomEvent } from '../utils';

export default {
  name: 'add-note-modal',
  handler: async function (client: Client, interaction: ModalSubmitInteraction, id: string) {
    const message = interaction.fields.getTextInputValue('note-message');

    const user = await client.users.fetch(id);

    logCustomEvent(interaction.guild!, {
      title: 'Note Added',
      description: null,
      color: 0x00FF00,
      timestamp: new Date(),
      fields: [
        {
          name: 'Moderator',
          value: `<@${interaction.user.id}>\n${interaction.user.username}`,
          inline: true
        },
        {
          name: 'User',
          value: `<@${id}>\n${user.username}`,
          inline: true
        },
        {
          name: 'Note',
          value: message,
          inline: true
        }
      ]
    });

    await Database.putNote(id, message, interaction.user.id);

    interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Note added' });
  }
};