import { AuditLogChange, AuditLogEvent, AuditLogOptionsType, GuildAuditLogsEntry, APIRole, time, TimestampStyles, PermissionsBitField, PermissionsString, Guild } from 'discord.js';
import { ApplicationCommandPermissionChangeLog, PermissionsChangeLog, PinExtras, RoleChangeLog, TimeoutChangeLog } from '../types';
import { getArrayDifference } from './array-utils';

export const enum TargetType {
  Unknown = 0,
  Role = 1,
  User = 2,
  Channel = 3
};

const TARGETS_ROLES: AuditLogEvent[] = [
  AuditLogEvent.RoleCreate,
  AuditLogEvent.RoleDelete,
  AuditLogEvent.RoleUpdate
];

const TARGETS_USERS: AuditLogEvent[] = [
  AuditLogEvent.MemberUpdate,
  AuditLogEvent.MemberKick,
  AuditLogEvent.MemberBanAdd,
  AuditLogEvent.MemberBanRemove,
  AuditLogEvent.MemberRoleUpdate,
  AuditLogEvent.MessageDelete,
  AuditLogEvent.MessagePin,
  AuditLogEvent.MessageUnpin
];

const TARGETS_CHANNELS: AuditLogEvent[] = [
  AuditLogEvent.ChannelCreate,
  AuditLogEvent.ChannelUpdate,
  AuditLogEvent.ChannelDelete,
  AuditLogEvent.ThreadCreate,
  AuditLogEvent.ThreadUpdate,
  AuditLogEvent.ThreadDelete,
  AuditLogEvent.ChannelOverwriteCreate,
  AuditLogEvent.ChannelOverwriteDelete,
  AuditLogEvent.ChannelOverwriteUpdate
];

export function getTargetType(actionType: AuditLogEvent): TargetType {
  if (TARGETS_ROLES.includes(actionType)) return TargetType.Role;
  else if (TARGETS_USERS.includes(actionType)) return TargetType.User;
  else if (TARGETS_CHANNELS.includes(actionType)) return TargetType.Channel;

  return TargetType.Unknown;
}

export function formatSnowflake(snowflake: string, targetType: TargetType): string {
  if (targetType == TargetType.Role) return `<@&${snowflake}>`;
  else if (targetType == TargetType.User) return `<@${snowflake}>`;
  else if (targetType == TargetType.Channel) return `<#${snowflake}>`;

  return snowflake;
}

export function formatChanges(entry: GuildAuditLogsEntry): string {
  return entry.changes.map(c => formatChange(c, entry)).filter(e => e).join('\n');
}

export function formatExtras(entry: GuildAuditLogsEntry, guild: Guild): string {
  if (entry.action == AuditLogEvent.MessagePin || entry.action == AuditLogEvent.MessageUnpin)
    return formatMessagePin(entry.extra as unknown as PinExtras, guild);

  if (entry.action == AuditLogEvent.ChannelOverwriteCreate
    || entry.action == AuditLogEvent.ChannelOverwriteDelete
    || entry.action == AuditLogEvent.ChannelOverwriteUpdate) {
    return `Target: ${entry.extra!.toString()}`;
  }

  try {
    const reserialized = JSON.parse(JSON.stringify(entry));

    const results: string[] = [];

    for (const [key, value] of Object.entries(reserialized.extra ?? {})) {
      if (!value) continue;

      if (key == 'channel_id') results.push(formatSnowflake(value as string, TargetType.Channel));

      results.push(`${key}: ${value}`);
    }

    return results.join('\n');
  } catch (e) {
    console.error(e);
    return '';
  }

  return '';
}

function formatChange(change: AuditLogChange, entry: GuildAuditLogsEntry): string | undefined {
  if (entry.action == AuditLogEvent.ApplicationCommandPermissionUpdate) {
    return formatApplicationPermissionsUpdate(change as ApplicationCommandPermissionChangeLog);
  }

  switch (change.key) {
    case '$add':
    case '$remove':
      return formatMemberRoleChange(change);

    case 'communication_disabled_until':
      return formatTimeoutChange(change);

    case 'permissions':
    case 'allow':
    case 'deny':
      return formatPermissionOrOverwrites(change as PermissionsChangeLog);
  }

  if (change.new !== undefined && change.old === undefined)
    return `Set ${change.key} to ${change.new}`;

  if (change.new === undefined && change.old !== undefined)
    return `Set ${change.key} with value ${change.old} to default/null`;

  return `Set ${change.key} from ${change.old} to ${change.new}`;
}

function formatApplicationPermissionsUpdate(change: ApplicationCommandPermissionChangeLog): string | undefined {
  if (change.new !== undefined && change.old === undefined)
    return `${change.new.permission ? 'Allowed' : 'Denied'} access ${change.new.type == 3 ? 'in' : (change.new.permission ? 'to' : 'from')} ${formatSnowflake(change.new.id, change.new.type)} for command: ${change.key}`;

  if (change.new === undefined && change.old !== undefined)
    return `Removed permission overrides from ${formatSnowflake(change.old.id, change.old.type)} for command: ${change.key}`;

  return `Updated permission overrides ${change.new!.type == 3 ? 'in' : 'for'} ${formatSnowflake(change.new!.id, change.new!.type)}: ${change.new!.permission ? 'allowed access to' : 'revoked access to'} command: ${change.key}`;
}

function formatMemberRoleChange(change: RoleChangeLog): string | undefined {
  if (!change.new) return;

  const changes: string[] = [];

  for (const roleChange of change.new) {
    if (change.key == '$add') changes.push(`Added role ${formatSnowflake(roleChange.id, TargetType.Role)}`);
    else changes.push(`Removed role ${formatSnowflake(roleChange.id, TargetType.Role)}`);
  }

  if (changes.length == 0) return;

  return changes.join('\n');
}

function formatTimeoutChange(change: TimeoutChangeLog): string {
  if (!change.new) return 'Timeout removed';

  const date = new Date(change.new);

  return `Timeout until ${time(date, TimestampStyles.RelativeTime)}`;
}

function formatPermissionOrOverwrites(change: PermissionsChangeLog): string {
  const oldPerms = new PermissionsBitField(BigInt(change.old ?? 0)).toArray();
  const newPerms = new PermissionsBitField(BigInt(change.new ?? 0)).toArray();

  switch (change.key) {
    case 'permissions':
      return formatPermissionChange(oldPerms, newPerms, 'Removed permission(s)', 'Added permission(s)');

    case 'allow':
      return formatPermissionChange(oldPerms, newPerms, 'Allow removed', 'Allow added');

    case 'deny':
      return formatPermissionChange(oldPerms, newPerms, 'Deny removed', 'Deny added');

    default:
      return formatPermissionChange(oldPerms, newPerms, `${change.key} removed`, `${change.key} added`);
  }
}

function formatPermissionChange(oldPermissions: PermissionsString[], newPermissions: PermissionsString[], removedDescription: string, addedDescription: string) {
  const { added, removed } = getArrayDifference(oldPermissions, newPermissions);

  const result: string[] = [];

  if (added.length > 0) {
    result.push(`${addedDescription}: ${added.join(', ')}`);
  }

  if (removed.length > 0) {
    result.push(`${removedDescription}: ${removed.join(', ')}`);
  }

  return result.join('\n');
}

function formatMessagePin(data: PinExtras, guild: Guild): string {
  return `Message: [${data.messageId}](https://discord.com/channels/${guild.id}/${data.channel.id}/${data.messageId})`;
}