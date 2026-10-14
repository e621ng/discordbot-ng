import { Client, MessageFlags, ModalSubmitInteraction } from 'discord.js';
import { Database } from '../shared/Database';
import { Modal } from '../types';
import { createPrivateHelpTicketThread } from '../utils';

class OpenTicketModal implements Modal<Client> {
  id = 'open-ticket-modal';

  async execute(context: Client<boolean>, interaction: ModalSubmitInteraction): Promise<void> {
    if (!interaction.inGuild()) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const guild = await context.guilds.fetch(interaction.guildId!);
      const member = await guild.members.fetch(interaction.user.id);

      const settings = await Database.getOrCreateSettings(interaction.guildId);
      if (settings.private_help_role_id) throw new Error("`private_help_role_id` hasn't been configured. Please report this error to staff.");

      const reason = interaction.fields.getTextInputValue('ticket-message');
      const thread = await createPrivateHelpTicketThread(context, guild, member, reason);
      if (!thread) throw new Error('Failed to create ticket. Please report this to a staff member.');

      await interaction.editReply({ content: `Your ticket has been created: ${thread}` });
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }
}

export default new OpenTicketModal();