import { Client, MessageFlags, ModalSubmitInteraction } from 'discord.js';
import { Database } from '../shared/Database';
import { createPrivateHelpTicketThread } from '../utils';

export default {
  name: 'open-ticket-modal',
  handler: async function (client: Client, interaction: ModalSubmitInteraction) {
    const guild = await client.guilds.fetch(interaction.guildId!);
    const member = await guild.members.fetch(interaction.user.id);

    const guildSettings = await Database.getGuildSettings(guild.id);

    if (!guildSettings || !guildSettings.private_help_role_id)
      return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Failed to create ticket. Please report this to a staff member.' });

    const reason = interaction.fields.getTextInputValue('ticket-message');

    const thread = await createPrivateHelpTicketThread(client, guild, member, reason);

    if (thread) interaction.reply({ flags: [MessageFlags.Ephemeral], content: `Your ticket has been created: ${thread}` });
    else interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Failed to create ticket. Please report this to a staff member.' });
  }
};