import { ActionRowBuilder, APIRole, ButtonBuilder, EmbedBuilder, PermissionsBitField, TextChannel } from 'discord.js';

export type MessageContent = { content?: string, embeds?: EmbedBuilder[], components: ActionRowBuilder<ButtonBuilder>[] };

export type RoleChangeLog = {
  key: '$add' | '$remove',
  old?: Pick<APIRole, 'id' | 'name'>[],
  new?: Pick<APIRole, 'id' | 'name'>[]
}

export type TimeoutChangeLog = {
  key: 'communication_disabled_until',
  old?: string,
  new?: string
}

export type PermissionsChangeLog = {
  key: 'permissions' | 'allow' | 'deny',
  old?: number,
  new?: number
}

export type PinExtras = {
  channel: TextChannel,
  messageId: string
}