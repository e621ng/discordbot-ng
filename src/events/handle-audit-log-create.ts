import { APIEmbedField, APIRole, AuditLogEvent, EmbedBuilder, Guild, GuildAuditLogsEntry, RoleFlags, SnowflakeUtil } from 'discord.js';
import { Database } from '../shared/Database';
import { formatChanges, formatExtras, formatSnowflake, getTargetType } from '../utils';

const IGNORED_ACTIONS = [
  AuditLogEvent.MemberMove,
  // Handled by automod.
  AuditLogEvent.AutoModerationFlagToChannel
];

export async function handleAuditLogCreate(entry: GuildAuditLogsEntry, guild: Guild) {
  if (!await shouldLog(entry, guild)) return;
  const settings = await Database.getGuildSettings(guild.id);

  if (!settings || !settings.audit_logs_channel_id) return;

  const channel = await guild.channels.fetch(settings.audit_logs_channel_id);

  if (!channel || !channel.isSendable()) return;

  const fields: APIEmbedField[] = [
    {
      name: 'Actor',
      value: `<@${entry.executorId}>`,
      inline: true
    }
  ];

  if (entry.targetId) {
    const targetType = getTargetType(entry.action);
    fields.push({
      name: 'Target',
      value: formatSnowflake(entry.targetId, targetType),
      inline: true
    });
  }

  if (entry.reason) {
    fields.push({
      name: 'Reason',
      value: entry.reason,
      inline: true
    });
  }

  if (entry.changes && entry.changes.length > 0) {
    fields.push({
      name: 'Changes',
      value: formatChanges(entry),
      inline: false
    });
  }

  if (entry.extra) {
    fields.push({
      name: 'Options',
      value: formatExtras(entry, guild),
      inline: false
    });
  }

  const embed = new EmbedBuilder()
    .setTitle(Object.keys(AuditLogEvent)[Object.values(AuditLogEvent).indexOf(entry.action)])
    .setTimestamp(Number(SnowflakeUtil.decode(entry.id).timestamp))
    .addFields(...fields);

  channel.send({ embeds: [embed] });
}

async function shouldLog(entry: GuildAuditLogsEntry, guild: Guild): Promise<boolean> {
  if (!entry.executorId) return true;

  if (IGNORED_ACTIONS.some(a => entry.action == a)) return false;

  if (entry.action == AuditLogEvent.MemberRoleUpdate) {
    return await shouldLogRoleChanges(entry as GuildAuditLogsEntry<AuditLogEvent.MemberRoleUpdate>, guild);
  }

  return true;
}

async function shouldLogRoleChanges(entry: GuildAuditLogsEntry<AuditLogEvent.MemberRoleUpdate>, guild: Guild): Promise<boolean> {
  for (const change of entry.changes) {
    // Get role changes from the log.
    const roles = (await Promise.all((change.new! as Pick<APIRole, 'id' | 'name'>[]).map(c => guild.roles.fetch(c.id))));

    // Check if role is part of onboarding.
    for (const role of roles) {
      if (role && !role.flags.has(RoleFlags.InPrompt)) return true;
    }
  }

  return false;
}