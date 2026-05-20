import { ButtonInteraction, Client, MessageFlags, MessageMentions } from 'discord.js';
import { createPrivateHelpTicketThread } from '../utils';

export default {
  name: 'open-ticket-for-reported-message',
  handler: async function (client: Client, interaction: ButtonInteraction) {
    const message = await interaction.message.fetch();
    const guild = await interaction.guild!.fetch();

    const reportEmbed = message.embeds[0]!;

    const regex = new RegExp(MessageMentions.UsersPattern);

    const reportedMessageUrl = reportEmbed.fields[0].value;
    const reporterId = regex.exec(reportEmbed.fields[2].value)!.groups!.id;
    const additionalInfo = reportEmbed.fields[3]?.name == 'Additional Information' ? reportEmbed.fields[3].value : '';

    const reporter = await guild.members.fetch(reporterId) ?? await client.users.fetch(reporterId);

    const thread = await createPrivateHelpTicketThread(client, guild, null, `Ticket creted by staff in response to message report: ${message.url}. Reported message: ${reportedMessageUrl}. ${additionalInfo ? `\n\nAdditional information provided in report:\n${additionalInfo.split('\n').map(c => `> ${c}`).join('\n')}` : ''}`, `Ticket: Message Report From ${reporter.displayName}`, [reporterId, interaction.user.id]);

    if (thread) {
      await interaction.reply({
        flags: [MessageFlags.Ephemeral],
        content: `Ticket created: ${thread}`
      });

      const requestIndex = reportEmbed.fields.findIndex(f => f.name == 'User Requested Private Ticket');
      if (requestIndex != -1) reportEmbed.fields.splice(requestIndex, 1);

      reportEmbed.fields.push({
        name: 'Private Help Ticket',
        value: thread.url,
        inline: false
      });

      await message.edit({ embeds: [reportEmbed], components: [] });
    }
  }
};