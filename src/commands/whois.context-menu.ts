import { ApplicationIntegrationType, Client, InteractionContextType, MessageFlags, PermissionFlagsBits, ContextMenuCommandBuilder, ApplicationCommandType, ContextMenuCommandInteraction, UserContextMenuCommandInteraction } from 'discord.js';
import { handleWhoIsInteraction } from '../utils';

export default {
  name: 'whois',
  data: new ContextMenuCommandBuilder()
    .setName('whois')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setType(ApplicationCommandType.User),
  handler: async function (client: Client, interaction: UserContextMenuCommandInteraction) {
    const idToUse = interaction.targetUser.id;

    handleWhoIsInteraction(interaction, idToUse, true);
  }
};