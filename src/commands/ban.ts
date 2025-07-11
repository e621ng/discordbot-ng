import { ApplicationIntegrationType, BitFieldResolvable, ChatInputCommandInteraction, Client, GuildBasedChannel, GuildMember, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder, time, TimestampStyles } from 'discord.js';
import { channelIsInStaffCategory, deferInteraction, handleWhoIsInteraction } from '../utils';
import { getRecordMessageFromDiscordId } from '../utils/record-utils';
import { Database } from '../shared/Database';

export default {
  name: 'ban',
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bans a user.')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The discord user to ban.')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('The reason for the ban')
        .setRequired(false)
        .setMaxLength(400)
    )
    .addNumberOption(option =>
      option
        .setName('hours')
        .setDescription('The duration of the ban, added with other options (0 for permanent).')
        .setRequired(false)
    )
    .addNumberOption(option =>
      option
        .setName('minutes')
        .setDescription('The duration of the ban, added with other options (0 for permanent).')
        .setRequired(false)
    )
    .addNumberOption(option =>
      option
        .setName('seconds')
        .setDescription('The duration of the ban, added with other options (0 for permanent).')
        .setRequired(false)
    )
    .addNumberOption(option =>
      option
        .setName('delete-message-days')
        .setDescription('How far back to delete messages (in days, default: 0 days).')
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

    const hours = (interaction.options.getNumber('hours') ?? 0) * 3.6e+6;
    const minutes = (interaction.options.getNumber('minutes') ?? 0) * 60000;
    const seconds = (interaction.options.getNumber('seconds') ?? 0) * 1000;

    const duration = hours + minutes + seconds;

    const deleteMessageDays = (interaction.options.getNumber('delete-message-days') ?? 0) * 86400;

    let banMember: GuildMember | null = null;

    try {
      banMember = await interaction.guild.members.fetch(user.id);
    } catch (e) {
      // Member not in server.
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);

    if (banMember && member.roles.highest.comparePositionTo(banMember.roles.highest) <= 0) {
      return await interaction.editReply('You do not have permission to ban this user.');
    }

    if (banMember && !banMember.bannable) {
      return await interaction.editReply('I do not have permission to ban this user.');
    }

    const expiresAt = new Date(Date.now() + duration);

    if (duration > 0) await Database.putBan(user.id, expiresAt);

    try {
      await interaction.guild.bans.create(user, {
        reason: (reason + ` Banned by ${interaction.user.username} (${interaction.user.id})${duration > 0 ? `. Expires at: ${time(expiresAt, TimestampStyles.ShortDateTime)}` : ''}`).trim(),
        deleteMessageSeconds: deleteMessageDays
      });
    } catch (e) {
      console.error(e);
      return await interaction.editReply("Error banning user (couldn't ban).");
    }

    await interaction.editReply('Banned.');
  }
};