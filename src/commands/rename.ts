import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, InteractionContextType, PermissionFlagsBits, RateLimitError, SlashCommandBuilder } from 'discord.js';
import { msToHuman } from '../utils';
import { Database } from '../shared/Database';

export default {
  name: 'rename',
  data: new SlashCommandBuilder()
    .setName('rename')
    .setDescription('Rename the general channel.')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(option =>
      option
        .setName('new-name')
        .setDescription('The new name of the general channel.')
        .setRequired(true)
    ),
  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    const guildSettings = await Database.getGuildSettings(interaction.guildId!);

    if (!guildSettings || !guildSettings.general_chat_id) {
      return interaction.reply('No general chat id found.');
    }

    const name = interaction.options.getString('new-name', true);
    const channel = await interaction.guild!.channels.fetch(guildSettings.general_chat_id)!;

    if (!channel) {
      return interaction.reply('No general chat id found.');
    }

    try {
      await channel.setName(name);

      interaction.reply(`Renamed general to ${channel.name}`);
    } catch (e: any) {
      if (e instanceof RateLimitError) {
        return interaction.reply(`Name change limited. Try again in ${msToHuman(e.retryAfter)}`);
      }

      console.error(e);
      return interaction.reply('An error has occurred.');
    }
  }
};