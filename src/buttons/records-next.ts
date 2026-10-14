import { ButtonInteraction, Client } from 'discord.js';
import { Button } from '../types';
import { getRecordMessageFromDiscordId } from '../utils';

class RecordsNextButton implements Button<Client> {
  id = 'records-next';

  async execute(context: Client<boolean>, interaction: ButtonInteraction, userId: string, page: string): Promise<void> {
    await interaction.deferUpdate();

    const message = await getRecordMessageFromDiscordId(userId, parseInt(page) + 1, interaction.guild!);
    if (!message) return;

    await interaction.editReply(message);
  }
}

export default new RecordsNextButton();