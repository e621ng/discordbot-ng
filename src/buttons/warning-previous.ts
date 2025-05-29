import { ButtonInteraction, Client} from 'discord.js';
import { getWarningMessage } from '../utils/warning-utils';

export default {
  name: 'warning-previous',
  handler: async function (client: Client, interaction: ButtonInteraction, userId: string, page: string) {
    await interaction.deferUpdate();

    const message = await getWarningMessage(userId, parseInt(page) - 1);

    if (!message) return;

    interaction.editReply(message);
  }
};