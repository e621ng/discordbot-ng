import { APIEmbed, Client, CommandInteraction } from 'discord.js';

type EmbedSeverity
  = | 'info'
  | 'warning'
  | 'error'
  | 'success'

export function CreateDefaultEmbed(context: Client): APIEmbed {
  if (!context.user) return {};

  return {
    color: 0x014995,

    footer: {
      icon_url: context.user.avatarURL()!,
      text: context.user.username
    },

    timestamp: new Date().toISOString()
  };
}

export function SetSeverity(severity: EmbedSeverity): APIEmbed {
  switch (severity) {
    case 'info': return { color: 0x5865F2 };
    case 'warning': return { color: 0xFEE75C };
    case 'error': return { color: 0xED4245 };
    case 'success': return { color: 0x57F287 };
  }
}


export async function createResponseEmbed(interaction: CommandInteraction, severity: EmbedSeverity, title: string, description: string): Promise<void> {
  await interaction.editReply({
    embeds: [{
      ...SetSeverity(severity),
      title: title,
      description: description,
    }],
  });
}
