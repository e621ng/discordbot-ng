import { ApplicationIntegrationType, BitFieldResolvable, ChatInputCommandInteraction, Client, GuildBasedChannel, GuildMember, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { channelIsInStaffCategory, deferInteraction, handleWhoIsInteraction } from '../utils';
import { getRecordMessageFromDiscordId } from '../utils/record-utils';

export default {
  name: 'softban',
  data: new SlashCommandBuilder()
    .setName('softban')
    .setDescription('Bans and immediately unbans a user to purge messages.')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The discord user to softban.')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('The reason for the softban')
        .setRequired(false)
        .setMaxLength(400)
    )
    .addNumberOption(option =>
      option
        .setName('days')
        .setDescription('How far back to delete messages (in days, default: 7 days).')
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(7)
    ),
  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    await deferInteraction(interaction);

    if (!interaction.guild) return interaction.editReply('This command must be used in a server');

    if (!interaction.guild.members.me) return interaction.editReply('An error has occurred. Please try again later.');

    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') ?? '';
    const seconds = (interaction.options.getNumber('days') ?? 7) * 86400;

    let banMember: GuildMember | null = null;

    try {
      banMember = await interaction.guild.members.fetch(user.id);
    } catch (e) {
      // Member not in server.
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);

    if (banMember && member.roles.highest.comparePositionTo(banMember.roles.highest) <= 0) {
      return await interaction.editReply('You do not have permission to softban this user.');
    }

    if (banMember && !banMember.bannable) {
      return await interaction.editReply('I do not have permission to softban this user.');
    }

    try {
      await interaction.guild.bans.create(user, {
        reason: (reason + ` Softban by ${interaction.user.username} (${interaction.user.id})`).trim(),
        deleteMessageSeconds: seconds
      });
    } catch (e) {
      console.error(e);
      return await interaction.editReply("Error softbanning user (couldn't ban).");
    }

    try {
      await interaction.guild.bans.remove(user);
    } catch (e) {
      console.error(e);
      return await interaction.editReply("Error softbanning user (couldn't remove ban).");
    }

    await interaction.editReply('Softban successful');
  }
};