import { CommandInteraction, Guild } from 'discord.js';
import { getE621Alts } from './alt-utils';
import { resolveUser } from './discord-user-utils';
import { SetSeverity } from './embed-utils';

export async function handleWhoIsInteraction(interaction: CommandInteraction, guild: Guild, valueToUse: string, ephemeral = false) {
  const user = await resolveUser(interaction.client, valueToUse, guild);
  if (!user) throw new Error('User not found.');

  const content = await getE621Alts(user.id, guild);
  await interaction.editReply({
    embeds: [{
      ...SetSeverity('info'),
      description: `<@${user.id}>'s (${user.id}) e621 and discord account(s):\n${content}`,
    }],
  });
}
