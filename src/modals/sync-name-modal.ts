import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Client, GuildTextBasedChannel, MessageFlags, ModalSubmitInteraction, TextChannel, ThreadAutoArchiveDuration } from 'discord.js';
import { Database } from '../shared/Database';
import { deferInteraction, logCustomEvent, syncName } from '../utils';
import { config } from '../config';

export default {
  name: 'sync-name-modal',
  handler: async function (client: Client, interaction: ModalSubmitInteraction, id: string) {
    await deferInteraction(interaction);

    const e621Id = Number(interaction.fields.getTextInputValue('id') ?? 0);

    console.log(e621Id);

    if (isNaN(e621Id)) return await interaction.editReply('Provided id is not a number');

    const member = await interaction.guild?.members.fetch(id);

    if (!member) {
      return interaction.editReply('An error has occurred. Please try again later.');
    }

    const guild = await interaction.client.guilds.fetch(config.DISCORD_GUILD_ID!);

    if (!guild) {
      return interaction.editReply('An error has occurred. Please try again later.');
    }

    if (!guild.members.me) {
      return interaction.editReply('An error has occurred. Please try again later.');
    }

    await syncName(interaction, member, e621Id);
  }
};