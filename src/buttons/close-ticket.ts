import { ButtonInteraction, Client, MessageFlags, ChannelType } from 'discord.js';
import { closeTicket } from '../utils';

export default {
  name: 'close-ticket',
  handler: async function (client: Client, interaction: ButtonInteraction) {
    const channel = await interaction.channel?.fetch();
    if (!channel || !channel.isThread() || !channel.isSendable() || channel.type != ChannelType.PrivateThread)
      return await interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Oops. Something went wrong. Please report this to a staff member.' });

    await interaction.reply({
      content: 'Closing, please wait...',
      flags: MessageFlags.Ephemeral
    });

    await interaction.message.edit({
      content: interaction.message.content,
      components: []
    });

    if (!await closeTicket(client, channel, `This ticket has been closed by ${interaction.user}`))
      return await interaction.editReply({ content: 'An error occurred while trying to close this ticket.' });

    await interaction.editReply({ content: 'Ticket closed.' });
  }
};