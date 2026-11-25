import { ApplicationIntegrationType, Client, InteractionContextType, PermissionFlagsBits, ContextMenuCommandBuilder, ApplicationCommandType, UserContextMenuCommandInteraction } from 'discord.js';
import { fetchGuildMember, openModTicketModal, SetSeverity } from '../utils';

export default {
  name: 'Open Mod Ticket',
  data: new ContextMenuCommandBuilder()
    .setName('Open Mod Ticket')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setType(ApplicationCommandType.User),
  handler: async function (client: Client, interaction: UserContextMenuCommandInteraction) {
    try {
      if (!interaction.inGuild()) return;

      const member = await fetchGuildMember(client, interaction.guildId, interaction.targetId);
      await openModTicketModal(interaction, member);
    } catch (error: Error | any) {
      await interaction.reply({ embeds: [{ ...SetSeverity('error'), description: error.message }] });
    }
  }
};