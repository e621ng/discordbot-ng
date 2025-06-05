import { ApplicationIntegrationType, Client, InteractionContextType, PermissionFlagsBits, ContextMenuCommandBuilder, ApplicationCommandType, UserContextMenuCommandInteraction, GuildBasedChannel } from 'discord.js';
import { channelIsInStaffCategory, deferInteraction, getNoteMessage, handleWhoIsInteraction } from '../utils';

export default {
  name: 'List Notes',
  data: new ContextMenuCommandBuilder()
    .setName('List Notes')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setType(ApplicationCommandType.User),
  handler: async function (client: Client, interaction: UserContextMenuCommandInteraction) {
    const idToUse = interaction.targetUser.id;

    await deferInteraction(interaction);

    const noteMessage = await getNoteMessage(idToUse, 1);

    if (!noteMessage) return interaction.editReply(`No notes found for <@${idToUse}>`);

    interaction.editReply(noteMessage);
  }
};