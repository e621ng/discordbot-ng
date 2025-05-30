import { CommandInteraction, MessageFlags } from 'discord.js';
import { config } from '../config';
import { Database } from '../shared/Database';
import { getE621Alts } from './alt-utils';

export async function handleWhoIsInteraction(interaction: CommandInteraction, idToUse: string, ephemeral = false) {
  if (ephemeral) await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
  else await interaction.deferReply();

  if (!interaction.guild) return interaction.editReply('This command must be used in a server');

  const content = await getE621Alts(idToUse, interaction.guild!);

  interaction.editReply(`<@${idToUse}>'s e621 and discord account(s):\n${content}`);
}