import { ApplicationCommandType, ApplicationIntegrationType, CheckboxBuilder, Client, ContextMenuCommandBuilder, InteractionContextType, LabelBuilder, MessageContextMenuCommandInteraction, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { Database } from '../../shared/Database';
import { Command } from '../../types';

class ReportMessageContextMenuCommand implements Command<Client<boolean>> {
  data = new ContextMenuCommandBuilder()
    .setName('Report Message')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setType(ApplicationCommandType.Message);

  async handleCommand(context: Client<boolean>, interaction: MessageContextMenuCommandInteraction): Promise<void> {
    if (!interaction.inGuild()) return;

    try {
      const settings = await Database.getOrCreateSettings(interaction.guildId);
      if (!settings.moderator_channel_id) throw new Error('There does not appear to be a configured moderator channel. Please report this issue to staff.');

      const guild = await context.guilds.fetch(interaction.guildId);
      const reportsChannel = await guild.channels.fetch(settings.moderator_channel_id);
      if (!reportsChannel || !reportsChannel.isSendable()) throw new Error('I was unable to locate the configured moderator channel. Please report this issue to staff.');

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

      const createTicketCheckbox = new CheckboxBuilder()
        .setCustomId('create-private-help-ticket');

      const createPrivateTicket = new LabelBuilder()
        .setLabel('Create Private Help Ticket')
        .setDescription('Should a private help ticket be opened with this report? (Does not bypass ticket restrictions)')
        .setCheckboxComponent(createTicketCheckbox);

      modal.addLabelComponents(additionalInfoLabel, createPrivateTicket);
      await interaction.showModal(modal);
    } catch (error: Error | any) {
      await interaction.reply({ content: error.message, flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  }
}

export default new ReportMessageContextMenuCommand();
