import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { openModTicketModal } from '../utils';

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
    if (!interaction.guild) return interaction.editReply('This command must be used in a server.');

    const user = interaction.options.getUser('user', true);
    const member = await interaction.guild.members.fetch(user.id);

    if (!member) return interaction.editReply('Could not find member.');

    openModTicketModal(interaction, member);
  }
};