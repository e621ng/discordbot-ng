import { ButtonInteraction, Client, ModalBuilder, TextInputStyle, MessageFlags } from 'discord.js';
import { canOpenPrivateHelpTicket, createTextInput } from '../utils';

export default {
  name: 'private-help',
  handler: async function (client: Client, interaction: ButtonInteraction) {
    if (!(await canOpenPrivateHelpTicket(interaction.user.id)))
      return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'You can only have one open ticket at a time that is less than a day old.' });

    const modal = new ModalBuilder()
      .setCustomId('open-ticket-modal')
      .setTitle('Get in contact');

    const label = createTextInput('ticket-message', 'What is the reason for your ticket?', null, true, TextInputStyle.Paragraph, 1500, 10);

    modal.addLabelComponents(label);

    await interaction.showModal(modal);
  }
};