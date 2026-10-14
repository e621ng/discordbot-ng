import { ButtonInteraction, Client } from 'discord.js';
import { Button } from '../types';
import { getNoteMessage } from '../utils';

class NotePreviousButton implements Button<Client> {
  id = 'note-previous';

  async execute(context: Client<boolean>, interaction: ButtonInteraction, userId: string, page: string): Promise<void> {
    await interaction.deferUpdate();

    const message = await getNoteMessage(userId, parseInt(page) - 1);
    if (!message) return;

    await interaction.editReply(message);
  }
}

export default new NotePreviousButton();