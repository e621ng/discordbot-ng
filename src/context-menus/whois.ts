import { ApplicationIntegrationType, Client, InteractionContextType, PermissionFlagsBits, ContextMenuCommandBuilder, ApplicationCommandType, UserContextMenuCommandInteraction } from 'discord.js';
import { deferInteraction, handleWhoIsInteraction } from '../utils';

export default {
  name: 'Whois',
  data: new ContextMenuCommandBuilder()
    .setName('Whois')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setType(ApplicationCommandType.User),
  handler: async function (client: Client, interaction: UserContextMenuCommandInteraction) {
    if (!interaction.inGuild()) return;
    await deferInteraction(interaction);

    const idToUse = interaction.targetUser.id;
    await handleWhoIsInteraction(interaction, idToUse);
  }
};
