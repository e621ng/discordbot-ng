import { CommandInteraction, MessageFlags } from 'discord.js';
import { getE621Alts } from './alt-utils';
import { resolveUser } from './discord-user-utils';

export async function handleWhoIsInteraction(interaction: CommandInteraction, valueToUse: string, ephemeral = false) {
  if (ephemeral) await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
  else await interaction.deferReply();

  if (!interaction.guild) return interaction.editReply('This command must be used in a server');

  const user = await resolveUser(interaction.client, valueToUse, interaction.guild);

  if (!user) return interaction.editReply('User not found.');

  const content = await getE621Alts(user.id, interaction.guild!);

  interaction.editReply(`<@${user.id}>'s (${user.id}) e621 and discord account(s):\n${content}`);
}