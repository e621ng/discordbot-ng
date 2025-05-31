import { ApplicationIntegrationType, Client, InteractionContextType, PermissionFlagsBits, ContextMenuCommandBuilder, ApplicationCommandType, UserContextMenuCommandInteraction, GuildBasedChannel } from 'discord.js';
import { channelIsInStaffCategory, handleWhoIsInteraction } from '../utils';

export default {
  name: 'Whois',
  data: new ContextMenuCommandBuilder()
    .setName('Whois')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setType(ApplicationCommandType.User),
  handler: async function (client: Client, interaction: UserContextMenuCommandInteraction) {
    const idToUse = interaction.targetUser.id;

    handleWhoIsInteraction(interaction, idToUse, !(await channelIsInStaffCategory(interaction.channel as GuildBasedChannel)));
  }
};