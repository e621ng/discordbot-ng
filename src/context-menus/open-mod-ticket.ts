import { ApplicationIntegrationType, Client, InteractionContextType, PermissionFlagsBits, ContextMenuCommandBuilder, ApplicationCommandType, UserContextMenuCommandInteraction } from 'discord.js';
import { openModTicketModal } from '../utils';

export default {
  name: 'Open Mod Ticket',
  data: new ContextMenuCommandBuilder()
    .setName('Open Mod Ticket')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setType(ApplicationCommandType.User),
  handler: async function (client: Client, interaction: UserContextMenuCommandInteraction) {
    const member = await interaction.guild?.members.fetch(interaction.targetUser.id);

    if (!member) return interaction.editReply('Could not find member.');

    openModTicketModal(interaction, member);
  }
};