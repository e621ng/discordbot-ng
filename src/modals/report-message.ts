import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder, GuildTextBasedChannel, MessageFlags, ModalSubmitInteraction } from 'discord.js';
import { Database } from '../shared/Database';
import { canOpenPrivateHelpTicket, createPrivateHelpTicketThread } from '../utils';

export default {
  name: 'report-message',
  handler: async function (client: Client, interaction: ModalSubmitInteraction, channelId: string, messageId: string) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const guild = await client.guilds.fetch(interaction.guildId!);
    const member = await guild.members.fetch(interaction.user.id);
    const reportedMessageChannel = await guild.channels.fetch(channelId) as GuildTextBasedChannel;
    const reportedMessage = await reportedMessageChannel?.messages.fetch(messageId);

    const additionalInfo = interaction.fields.getTextInputValue('additional-info');
    const createPrivateHelpTicket = interaction.fields.getStringSelectValues('create-private-help-ticket')[0] == 'yes';

    if (!reportedMessageChannel || !reportedMessage)
      return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Failed to submit report. Please report this to a staff member.' });

    const guildSettings = await Database.getGuildSettings(interaction.guildId!);

    if (!guildSettings || !guildSettings.moderator_channel_id)
      return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Report channel missing. Unable to submit report.' });

    const reportsChannel = await interaction.guild!.channels.fetch(guildSettings.moderator_channel_id);

    if (!reportsChannel || !reportsChannel.isSendable())
      return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Report channel missing. Unable to submit report.' });

    const embed = new EmbedBuilder()
      .setTitle('New Message Report!')
      .setColor(0xFF0000)
      .addFields(
        {
          name: 'Message',
          value: reportedMessage.url,
          inline: false
        },
        {
          name: 'Message Author',
          value: reportedMessage.author.toString(),
          inline: false
        },
        {
          name: 'Reporter',
          value: member.toString(),
          inline: false
        });

    if (additionalInfo) {
      embed.addFields(
        {
          name: 'Additional Information',
          value: additionalInfo,
          inline: false
        }
      );
    }

    let replyContent = "Thanks for making a report! I've notified the moderators who can take further action.";

    const wantsTicketButCantOpen = createPrivateHelpTicket && !await canOpenPrivateHelpTicket(member.id);

    if (wantsTicketButCantOpen) {
      embed.addFields(
        {
          name: 'User Requested Private Ticket',
          value: 'The user requested a private ticket be opened, but already has an open ticket. If additional information is needed, press the button below to open a ticket with the user.',
          inline: false
        }
      );

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

    if (createPrivateHelpTicket && !wantsTicketButCantOpen) {
      if (!guildSettings.private_help_channel_id) {
        replyContent += ' Could not open private help ticket. Private help channel not set. Please report this to a staff member.';
      } else {
        const thread = await createPrivateHelpTicketThread(client, guild, member, `Ticket created with message report (${reportMessage.url}). ${member}, use this channel to talk with staff privately about the reported message (${reportedMessage.url}). ${additionalInfo ? `\n\nAdditional information provided in report:\n${additionalInfo.split('\n').map(c => `> ${c}`).join('\n')}` : ''}`);
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
  }
};