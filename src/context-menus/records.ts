import { ApplicationCommandType, ApplicationIntegrationType, Client, ContextMenuCommandBuilder, InteractionContextType, PermissionFlagsBits, UserContextMenuCommandInteraction } from 'discord.js';
import { deferInteraction, getRecordMessageFromDiscordId } from '../utils';

export default {
  name: 'Get Records',
  data: new ContextMenuCommandBuilder()
    .setName('Get Records')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setType(ApplicationCommandType.User),
  handler: async function (client: Client, interaction: UserContextMenuCommandInteraction) {
    await deferInteraction(interaction);

    const idToUse = interaction.targetUser.id;

    const recordMessage = await getRecordMessageFromDiscordId(idToUse, 1, interaction.guild!);

    if (!recordMessage) return interaction.editReply('No records found on any linked accounts.');

    interaction.editReply(recordMessage);
  }
};