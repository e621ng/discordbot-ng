import { ButtonInteraction, Client, ModalBuilder, TextInputStyle, MessageFlags } from 'discord.js';
import { Button } from '../types';
import { canOpenPrivateHelpTicket, createTextInput } from '../utils';

class PrivateHelpButton implements Button<Client> {
  id = 'private-help';

  async execute(context: Client<boolean>, interaction: ButtonInteraction): Promise<void> {
    try {
      if (!await canOpenPrivateHelpTicket(interaction.user.id))
        throw new Error('You can only have one open ticket at a time that is less than a day old.');

      const modal = new ModalBuilder()
        .setCustomId('open-ticket-modal')
        .setTitle('Get in contact');

      const label = createTextInput('ticket-message', 'What is the reason for your ticket?', null, true, TextInputStyle.Paragraph, 1500, 10);
      modal.addLabelComponents(label);

      await interaction.showModal(modal);
    } catch (error: Error | any) {
      await interaction.reply({
        content: error.message,
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  }
}

export default new PrivateHelpButton();
