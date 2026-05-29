import { Client, MessageFlags, ModalSubmitInteraction } from 'discord.js';
import { Database } from '../shared/Database';
import { createPrivateHelpTicketThread } from '../utils';

const warning = '\n\n\nLeaving this thread without acknowledgement may result in punishment. Staff will close the thread when they deem your response acceptable.';

export default {
  name: 'open-mod-ticket',
  handler: async function (client: Client, interaction: ModalSubmitInteraction, userId: string) {
    const guild = await client.guilds.fetch(interaction.guildId!);
    const member = await guild.members.fetch(userId);

    const guildSettings = await Database.getGuildSettings(guild.id);

    if (!guildSettings || !guildSettings.private_help_channel_id)
      return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Failed to create ticket. Please report this to a developer.' });

    const title = interaction.fields.getTextInputValue('title') ? interaction.fields.getTextInputValue('title') : `Mod Ticket For ${member.displayName}`;
    const reason = interaction.fields.getTextInputValue('initial-message') + warning;
    const autoJoin = interaction.fields.getStringSelectValues('auto-join-thread')[0] == 'yes';

    const membersToAdd = [userId];

    if (autoJoin) membersToAdd.push(interaction.user.id);

    const thread = await createPrivateHelpTicketThread(client, guild, null, reason, title, membersToAdd);

    if (thread) interaction.reply({ flags: [MessageFlags.Ephemeral], content: `Mod ticket created: ${thread}.${!autoJoin ? "You've selected not to auto join the thread. You will not be notified of messages sent there. You will have to check the thread periodically for user response." : ''}` });
    else interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Failed to create ticket. Please report this to a developer.' });
  }
};