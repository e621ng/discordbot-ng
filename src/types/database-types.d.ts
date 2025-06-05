export type LoggedMessage = {
  id: string
  author_id: string
  author_name: string
  channel_id: string
  attachments: string
  stickers: string
  content: string
}

export type GuildSettings = {
  guild_id: string
  general_chat_id?: string
  new_member_channel_id?: string
  tickets_channel_id?: string
  event_logs_channel_id?: string
  audit_logs_channel_id?: string
  voice_logs_channel_id?: string
  admin_role_id?: string
  private_help_role_id?: string
  staff_categories?: string
  safe_channels?: string
  link_skip_channels?: string
}

export type GuildArraySetting = 'staff_categories' | 'safe_channels' | 'link_skip_channels';

export type TicketMessage = {
  id: number
  message_id: string
}

export type TicketPhrase = {
  id: number
  user_id: string
  phrase: string
}

export type Note = {
  id: number
  user_id: string
  reason: string
  mod_id: string
  timestamp: string
}

export type Ban = {
  id: number
  user_id: string
  expires_at: string
}