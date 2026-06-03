import { APIEmbed, Client } from 'discord.js';

type EmbedSeverity =
  | 'default'
  | 'info'
  | 'warning'
  | 'error'
  | 'success'

export function CreateDefaultEmbed(context: Client): APIEmbed {
  if (!context.user) return {};

  return {
    footer: {
      icon_url: context.user.avatarURL()!,
      text: context.user.username
    },

    timestamp: new Date().toISOString()
  };
}

export function SetSeverity(severity: EmbedSeverity): APIEmbed {
  switch (severity) {
    case 'default': return { color: 0x014995 };
    case 'info': return { color: 0x5865F2 };
    case 'warning': return { color: 0xFEE75C };
    case 'error': return { color: 0xED4245 };
    case 'success': return { color: 0x57F287 };
  }
}
