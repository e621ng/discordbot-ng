import { ChatInputCommandInteraction, ContextMenuCommandInteraction, GuildBasedChannel, MessageFlags, ModalSubmitInteraction } from 'discord.js';
import { channelIsInStaffCategory } from './channel-utils';

export async function deferInteraction(interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction | ModalSubmitInteraction) {
  const isStaffChannel = await channelIsInStaffCategory(interaction.channel as GuildBasedChannel);

  if (isStaffChannel) await interaction.deferReply();
  else await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
}