import { CommandInteraction } from 'discord.js';
import { getE621Alts, resolveUser, SetSeverity } from '.';

export async function handleWhoIsInteraction(interaction: CommandInteraction, valueToUse: string) {
  const user = await resolveUser(interaction.client, valueToUse, interaction.guild);

  if (!user) {
    await interaction.editReply({
      embeds: [{
        ...SetSeverity('warning'),
        description: "The requested user couldn't be fetched.",
      }],
    });

    return;
  }

  const content = await getE621Alts(user.id, interaction.guild!);
  await interaction.editReply({
    embeds: [{
      ...SetSeverity('info'),
      description: `<@${user.id}>'s (${user.id}) e621 and discord account(s):\n${content}`,
    }],
  });
}
