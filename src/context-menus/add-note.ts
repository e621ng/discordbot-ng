import { ApplicationCommandType, ApplicationIntegrationType, Client, ContextMenuCommandBuilder, InteractionContextType, ModalBuilder, PermissionFlagsBits, TextInputStyle, UserContextMenuCommandInteraction } from 'discord.js';
import { createTextInput } from '../utils';

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

    const inputLabel = createTextInput('note-message', 'Note Message', null, true, TextInputStyle.Paragraph, 1500, 2);

    modal.addLabelComponents(inputLabel);

    await interaction.showModal(modal);
  }
};