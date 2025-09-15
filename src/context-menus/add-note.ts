import { ActionRowBuilder, ApplicationCommandType, ApplicationIntegrationType, Client, ContextMenuCommandBuilder, InteractionContextType, ModalBuilder, PermissionFlagsBits, TextInputBuilder, TextInputStyle, UserContextMenuCommandInteraction } from 'discord.js';

export default {
  name: 'Add Note',
  data: new ContextMenuCommandBuilder()
    .setName('Add Note')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setType(ApplicationCommandType.User),
  handler: async function (client: Client, interaction: UserContextMenuCommandInteraction) {
    const idToUse = interaction.targetUser.id;

    const member = await interaction.guild?.members.fetch(idToUse);

    const modal = new ModalBuilder()
      .setCustomId(`add-note-modal_${idToUse}`)
      .setTitle(`Adding note to ${member ? member.displayName : idToUse}`);

    const input = new TextInputBuilder()
      .setCustomId('note-message')
      .setLabel('Note message')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMinLength(2)
      .setMaxLength(1500);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));

    await interaction.showModal(modal);
  }
};