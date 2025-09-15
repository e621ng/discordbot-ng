import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, InteractionContextType, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { config } from '../config';
import { syncName } from '../utils';

export default {
  name: 'name-sync',
  data: new SlashCommandBuilder()
    .setName('name-sync')
    .setDescription('Sync your discord nickname to your e621 name.')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM)
    .addIntegerOption(option =>
      option
        .setName('id')
        .setDescription('The id of the e621 user to sync your nickname to.')
        .setRequired(false)
    ),
  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    const id = interaction.options.getInteger('id');

    const guild = await interaction.client.guilds.fetch(config.DISCORD_GUILD_ID!);

    if (!guild) {
      return interaction.editReply('An error has occurred. Please try again later.');
    }

    const member = await guild.members.fetch(interaction.user.id);

    if (!member || !guild.members.me) {
      return interaction.editReply('An error has occurred. Please try again later.');
    }

    await syncName(interaction, member, id);
  }
};