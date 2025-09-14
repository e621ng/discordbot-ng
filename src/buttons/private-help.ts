import { ActionRowBuilder, ButtonInteraction, Client, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } from 'discord.js';
import { canOpenPrivateHelpTicket } from '../utils';

export default {
  name: 'private-help',
  handler: async function (client: Client, interaction: ButtonInteraction) {
    if (!(await canOpenPrivateHelpTicket(interaction.user.id)))
      return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'You can only have one open ticket at a time that is less than a day old.' });

    const modal = new ModalBuilder()
      .setCustomId('open-ticket-modal')
      .setTitle('Get in contact');

    const input = new TextInputBuilder()
      .setCustomId('ticket-message')
      .setLabel('What is the reason for your ticket?')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Please be as thorough as possible.')
      .setRequired(true)
      .setMinLength(10)
      .setMaxLength(1500);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));

    await interaction.showModal(modal);
  }
};