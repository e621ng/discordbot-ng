import { ButtonInteraction, Client } from 'discord.js';
import { getNoteMessage } from '../utils/note-utils';

export default {
  name: 'note-next',
  handler: async function (client: Client, interaction: ButtonInteraction, userId: string, page: string) {
    await interaction.deferUpdate();

    const message = await getNoteMessage(userId, parseInt(page) + 1);

    if (!message) return;

    interaction.editReply(message);
  }
};