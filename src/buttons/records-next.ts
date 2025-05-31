import { ButtonInteraction, Client } from 'discord.js';
import { getRecordMessageFromDiscordId } from '../utils';

export default {
  name: 'records-next',
  handler: async function (client: Client, interaction: ButtonInteraction, userId: string, page: string) {
    await interaction.deferUpdate();

    const message = await getRecordMessageFromDiscordId(userId, parseInt(page) + 1, interaction.guild!);

    if (!message) return;

    interaction.editReply(message);
  }
};