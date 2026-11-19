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

  let content: string;

  try {
    content = await getE621Alts(user.id, interaction.guild!);
  } catch (error: Error | any) {
    await interaction.editReply({
      embeds: [{
        ...SetSeverity('error'),
        description: `An error occured while trying to fetch the alt accounts for ${user.tag}.`,
      }],
    });

    return;
  }

  if (!content) {
    await interaction.editReply({
      embeds: [{
        ...SetSeverity('warning'),
        description: `<@${user.id}> (${user.id}) has no linked accounts.`,
      }],
    });

    return;
  }

  if (content.length > 4000) content = content.slice(0, 3900) + '\n*[...]*';

  await interaction.editReply({
    embeds: [{
      ...SetSeverity('info'),
      description: `<@${user.id}>'s (${user.id}) e621 and discord account(s):\n${content}`,
    }],
  });
}
