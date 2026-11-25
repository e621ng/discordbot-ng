import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { fetchGuildMember, openModTicketModal, SetSeverity } from '../utils';

export default {
  name: 'mod-ticket',
  data: new SlashCommandBuilder()
    .setName('mod-ticket')
    .setDescription('Opens a mod private ticket and pulls the user into it.')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to pull in to the ticket.')
        .setRequired(true)
    ),

  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    try {
      if (!interaction.inGuild()) return;

      const user = interaction.options.getUser('user', true);
      const member = await fetchGuildMember(client, interaction.guildId, user.id);

      await openModTicketModal(interaction, member);
    } catch (error: Error | any) {
      await interaction.reply({ embeds: [{ ...SetSeverity('error'), description: error.message }] });
    }
  }
};