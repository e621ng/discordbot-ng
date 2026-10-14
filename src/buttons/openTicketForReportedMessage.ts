import { ButtonInteraction, Client, MessageFlags, MessageMentions } from 'discord.js';
import { Button } from '../types';
import { createPrivateHelpTicketThread } from '../utils';

class OpenTicketForReportedMessageButton implements Button<Client> {
  id = 'open-ticket-for-reported-message';

  async execute(context: Client<boolean>, interaction: ButtonInteraction): Promise<void> {
    if (!interaction.inGuild()) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const guild = await context.guilds.fetch(interaction.guildId);
      const message = await interaction.message.fetch();

      const reportEmbed = message.embeds[0]!;
      const regex = new RegExp(MessageMentions.UsersPattern);

      const reportedMessageUrl = reportEmbed.fields[0].value;
      const reporterId = regex.exec(reportEmbed.fields[2].value)!.groups!.id;
      const additionalInfo = reportEmbed.fields[3]?.name == 'Additional Information' ? reportEmbed.fields[3].value : '';
      const reporter = await guild.members.fetch(reporterId) ?? await context.users.fetch(reporterId);

      const thread = await createPrivateHelpTicketThread(context, guild, null, `Ticket creted by staff in response to message report: ${message.url}. Reported message: ${reportedMessageUrl}. ${additionalInfo ? `\n\nAdditional information provided in report:\n${additionalInfo.split('\n').map(c => `> ${c}`).join('\n')}` : ''}`, `Ticket: Message Report From ${reporter.displayName}`, [reporterId, interaction.user.id]);
      if (!thread) throw new Error('An error occured and a thread was not created.');

      await interaction.editReply({ content: `Ticket Created: ${thread}` });

      const requestIndex = reportEmbed.fields.findIndex(f => f.name == 'User Requested Private Ticket');
      if (requestIndex != -1) reportEmbed.fields.splice(requestIndex, 1);

      reportEmbed.fields.push({
        name: 'Private Help Ticket',
        value: thread.url,
        inline: false
      });

      await message.edit({ embeds: [reportEmbed], components: [] });
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }
}

export default new OpenTicketForReportedMessageButton();