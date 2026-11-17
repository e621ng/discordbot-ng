import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, Guild, GuildMember, InteractionContextType, PermissionFlagsBits, SlashCommandBuilder, time, TimestampStyles, User } from 'discord.js';
import { Database } from '../shared/Database';
import { Command } from '../types';
import { AltData, comprehensiveAltLookupFromDiscord, deferInteraction, getIdFromInput, SetSeverity } from '../utils';

async function removeAllAlts(altData: AltData[], guild: Guild, moderator: User, fullBan: boolean, reason: string, deleteMessageDays: number, duration: number, expiresAt: Date) {
  for (const data of altData) {
    if (data.type == 'discord') {
      try {
        if (!data.banned) {
          await guild.members.kick(data.thisId as string, (reason + ` ${fullBan ? 'Full banned' : 'Banned'} by ${moderator.username} (${moderator.id})${duration > 0 ? `. Expires: ${time(expiresAt, TimestampStyles.ShortDateTime)}` : ''}`).trim());
        }
      } catch (e) {
        console.error(e);
      }
    }

    await removeAllAlts(data.alts, guild, moderator, fullBan, reason, deleteMessageDays, duration, expiresAt);
  }
}

class BanCommand implements Command<Client<boolean>> {
  data = new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bans a user.')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(option =>
      option
        .setName('user')
        .setDescription('The discord user mention, or ID, to ban.')
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
    )
    .addBooleanOption(option =>
      option
        .setName('full-ban')
        .setDescription('Whether or not to prevent the user from joining on known alts (and ban all existing alts).')
        .setRequired(false)
    );

  async handleCommand(context: Client<boolean>, interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inGuild()) return;
    await deferInteraction(interaction);

    try {
      const input = interaction.options.getString('user', true);
      const idToUse = getIdFromInput(input);

      const hours = (interaction.options.getNumber('hours') ?? 0) * 3.6e+6;
      const minutes = (interaction.options.getNumber('minutes') ?? 0) * 60000;
      const seconds = (interaction.options.getNumber('seconds') ?? 0) * 1000;
      const duration = hours + minutes + seconds;

      const reason = interaction.options.getString('reason') ?? '';
      const deleteMessageDays = (interaction.options.getNumber('delete-message-days') ?? 0) * 86400;
      const fullBan = interaction.options.getBoolean('full-ban') ?? false;

      const guild = await context.guilds.fetch(interaction.guildId);
      let banMember: GuildMember | null = null;

      try {
        banMember = await guild.members.fetch(idToUse);
      } catch (e) {
        // Member not in server.
      }

      const member = await guild.members.fetch(interaction.user.id);
      if (banMember && member.roles.highest.comparePositionTo(banMember.roles.highest) <= 0) throw new Error("You don't have permission to ban this user.");
      if (banMember && !banMember.bannable) throw new Error("I don't have permission to ban this user.");

      const expiresAt = new Date(Date.now() + duration);
      await Database.putBan(idToUse, duration > 0 ? expiresAt : null, fullBan);

      try {
        await guild.bans.create(idToUse, {
          reason: (reason + ` ${fullBan ? 'Full banned' : 'Banned'} by ${interaction.user.username} (${interaction.user.id})${duration > 0 ? `. Expires: ${time(expiresAt, TimestampStyles.LongDateShortTime)}` : ''}`).trim(),
          deleteMessageSeconds: deleteMessageDays
        });
      } catch (e) {
        throw new Error('An error occured while trying to process the ban through Discord.');
      }

      if (fullBan) {
        const alts = await comprehensiveAltLookupFromDiscord(idToUse, guild);
        await removeAllAlts([alts], guild, interaction.user, fullBan, reason, deleteMessageDays, duration, expiresAt);
      }

      await interaction.editReply({
        embeds: [{
          ...SetSeverity('success'),
          description: `<@${idToUse}> (${idToUse}) has been ${fullBan ? 'full banned' : 'banned'}.`,
        }],
      });
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }
}

export default new BanCommand();
