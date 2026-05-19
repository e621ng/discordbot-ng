import { ApplicationCommandType, ApplicationIntegrationType, Client, ContextMenuCommandBuilder, InteractionContextType, LabelBuilder, MessageContextMenuCommandInteraction, MessageFlags, ModalBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

import { Database } from '../shared/Database';

export default {
  name: 'Report Message',

  data: new ContextMenuCommandBuilder()
    .setName('Report Message')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setType(ApplicationCommandType.Message),

  handler: async function (client: Client, interaction: MessageContextMenuCommandInteraction) {
    try {
      const modal = new ModalBuilder()
        .setCustomId(`report-message_${interaction.targetMessage.channelId}_${interaction.targetMessage.id}`)
        .setTitle(`Report message from ${interaction.targetMessage.member?.displayName ?? interaction.targetMessage.author.displayName}`);

      const additionalInfoInput = new TextInputBuilder()
        .setCustomId('additional-info')
        .setMaxLength(1000)
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

      const additionalInfoLabel = new LabelBuilder()
        .setLabel('Additional Information')
        .setDescription('Any additional information? This will help staff understand your report. 1000 characters maximum.')
        .setTextInputComponent(additionalInfoInput);

      const yesNoMenu = new StringSelectMenuBuilder()
        .setCustomId('create-private-help-ticket')
        .setRequired(false)
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel('No')
            .setDefault(true)
            .setValue('no'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Yes')
            .setDefault(false)
            .setValue('yes')
        );

      const createPrivateTicket = new LabelBuilder()
        .setLabel('Create Private Help Ticket')
        .setDescription('Should a private help ticket be opened with this report? (Does not bypass ticket restrictions)')
        .setStringSelectMenuComponent(yesNoMenu);

      modal.addLabelComponents(additionalInfoLabel, createPrivateTicket);

      const guildSettings = await Database.getGuildSettings(interaction.guildId!);

      if (!guildSettings || !guildSettings.moderator_channel_id)
        return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Report channel missing. Unable to submit report' });

      const reportsChannel = await interaction.guild!.channels.fetch(guildSettings.moderator_channel_id);

      if (!reportsChannel || !reportsChannel.isSendable())
        return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Report channel missing. Unable to submit report' });

      await interaction.showModal(modal);

      // await reportsChannel.send({
      //   embeds: [{
      //     title: 'New Message Report!',
      //     fields: [
      //       {
      //         name: 'Message',
      //         value: interaction.targetMessage.url,
      //         inline: false
      //       },
      //       {
      //         name: 'Author',
      //         value: interaction.targetMessage.author.toString(),
      //         inline: false
      //       },
      //       {
      //         name: 'Reporter',
      //         value: interaction.user.toString(),
      //         inline: false
      //       }
      //     ]
      //   }]
      // });

      // await interaction.reply({
      //   embeds: [{
      //     color: 0x014995,
      //     description:
      //       "Thanks for making a report! I've notified the moderators who can take further action."
      //   }],
      //   flags: [MessageFlags.Ephemeral]
      // });
    } catch (error) {
      console.error(error);
      if (!interaction.replied) {
        await interaction.reply({
          content: 'Hmm, an error occurred while processing your request. If you receive this error more than once, DM a moderator for further assistance.',
          flags: [MessageFlags.Ephemeral]
        });
      }
    }
  }
};