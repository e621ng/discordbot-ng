import { ActionRowBuilder, ButtonInteraction, Client, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } from 'discord.js';
import { ticketCooldownMap } from '../shared/ticket-cooldown';

export default {
  name: 'private-help',
  handler: async function (client: Client, interaction: ButtonInteraction) {
    const allowedAt = ticketCooldownMap.get(interaction.user.id);

    if (allowedAt && Date.now() < allowedAt)
      return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'You can only create one ticket per day.' });

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