import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder, GuildTextBasedChannel, MessageFlags, ModalSubmitInteraction } from 'discord.js';
import { Database } from '../shared/Database';
import { canOpenPrivateHelpTicket, createPrivateHelpTicketThread } from '../utils';
import { Modal } from '../types';

class ReportMessageModal implements Modal<Client> {
  id = 'report-message';

  async execute(context: Client<boolean>, interaction: ModalSubmitInteraction, channelId: string, messageId: string): Promise<void> {
    if (!interaction.inGuild()) return;
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    try {
      const guild = await context.guilds.fetch(interaction.guildId!);
      const member = await guild.members.fetch(interaction.user.id);
      const reportedMessageChannel = await guild.channels.fetch(channelId) as GuildTextBasedChannel;
      const reportedMessage = await reportedMessageChannel?.messages.fetch(messageId);

      const additionalInfo = interaction.fields.getTextInputValue('additional-info');
      const createPrivateHelpTicket = interaction.fields.getCheckbox('create-private-help-ticket');

      if (!reportedMessageChannel || !reportedMessage) throw new Error('Failed to submit report. Please report this to a staff member.');

      const settings = await Database.getOrCreateSettings(interaction.guildId);
      if (!settings.moderator_channel_id) throw new Error('Report channel missing. Unable to submit report.');

      const reportsChannel = await interaction.guild!.channels.fetch(settings.moderator_channel_id);
      if (!reportsChannel || !reportsChannel.isSendable()) throw new Error('Report channel missing. Unable to submit report.');

      const embed = new EmbedBuilder()
        .setTitle('New Message Report!')
        .setColor(0xFF0000)
        .addFields(
          { name: 'Message', value: reportedMessage.url, inline: false },
          { name: 'Author', value: reportedMessage.author.toString(), inline: false },
          { name: 'Reporter', value: member.toString(), inline: false }
        );

      if (additionalInfo) embed.addFields({ name: 'Additional Information', value: additionalInfo, inline: false });

      let replyContent = "Thanks for making a report! I've notified the moderators who can take further action.";
      const wantsTicketButCantOpen = createPrivateHelpTicket && !await canOpenPrivateHelpTicket(member.id);

      if (wantsTicketButCantOpen) {
        embed.addFields({
          name: 'User Requested Private Ticket',
          value: 'The user requested a private ticket be opened, but already has an open ticket. If additional information is needed, press the button below to open a ticket with the user.',
          inline: false
        });

        replyContent += " Could not open private help ticket since you already have one open. Staff have been notified that you'd like to have a ticket opened, and can make one for you if they deem it necessary.";
      }

      const openTicketButton = new ButtonBuilder()
        .setCustomId('open-ticket-for-reported-message')
        .setLabel('Open Private Ticket')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(openTicketButton);

      const reportMessage = await reportsChannel.send({
        embeds: [embed],
        components: createPrivateHelpTicket && !wantsTicketButCantOpen ? [] : [row]
      });

      await reportsChannel.send({ files: [new AttachmentBuilder(Buffer.from(reportedMessage.content), { name: 'message-content.txt' })] });

      if (createPrivateHelpTicket && !wantsTicketButCantOpen) {
        if (!settings.private_help_channel_id) {
          replyContent += ' Could not open private help ticket. Private help channel not set. Please report this to a staff member.';
        } else {
          const thread = await createPrivateHelpTicketThread(context, guild, member, `Ticket created with message report (${reportMessage.url}). ${member}, use this channel to talk with staff privately about the reported message (${reportedMessage.url}). ${additionalInfo ? `\n\nAdditional information provided in report:\n${additionalInfo.split('\n').map(c => `> ${c}`).join('\n')}` : ''}`);
          if (thread) {
            replyContent += ` Private help ticket created: ${thread}.`;

            embed.addFields({
              name: 'Private Help Ticket',
              value: thread.url,
              inline: false
            });

            await reportMessage.edit({ embeds: [embed] });
          } else {
            replyContent += ' There was an issue opening a private help ticket, please report this to a staff member.';

            await reportMessage.edit({
              embeds: [embed],
              components: [row]
            });
          }
        }
      }

      await interaction.editReply(replyContent);
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }
}