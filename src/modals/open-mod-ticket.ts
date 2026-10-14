import { Client, MessageFlags, ModalSubmitInteraction } from 'discord.js';
import { Database } from '../shared/Database';
import { Modal } from '../types';
import { createPrivateHelpTicketThread } from '../utils';

const warning = '\n\n\nLeaving this thread without acknowledgement may result in punishment. Staff will close the thread when they deem your response acceptable.';

class OpenModTicketModal implements Modal<Client> {
  id = 'open-mod-ticket';

  async execute(context: Client<boolean>, interaction: ModalSubmitInteraction, userId: string): Promise<void> {
    if (!interaction.inGuild()) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const settings = await Database.getOrCreateSettings(interaction.guildId);
      if (!settings.private_help_channel_id) throw new Error("`private_help_channel_id` hasn't been configured. Please report this error to staff.");

      const guild = await context.guilds.fetch(interaction.guildId);
      const member = await guild.members.fetch(userId);

      const title = interaction.fields.getTextInputValue('title') ? interaction.fields.getTextInputValue('title') : `Mod Ticket For ${member.displayName}`;
      const reason = interaction.fields.getTextInputValue('initial-message') + warning;
      const autoJoin = interaction.fields.getCheckbox('auto-join-thread');

      const membersToAdd = [userId];
      if (autoJoin) membersToAdd.push(interaction.user.id);

      const thread = await createPrivateHelpTicketThread(context, guild, null, reason, title, membersToAdd);
      if (!thread) throw new Error('Failed to create a ticket thread. Please report this to a developer.');

      await interaction.editReply({ content: `Mod ticket created: ${thread}. ${!autoJoin ? "You've selected not to auto join the thread. You will not be notified of messages sent there. You will have to check the thread periodically for user response." : ''}` });
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }
}

export default new OpenModTicketModal();