import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Database } from '../shared/Database';
import { getE621User } from '../utils';
import { config } from '../config';
import { E621User } from '../types';

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
    await interaction.deferReply({flags: [MessageFlags.Ephemeral]});

    const id = interaction.options.getInteger('id');

    const availableIds = await Database.getE621Ids(interaction.user.id);

    let e621User: E621User | null;

    if (!id || !availableIds.includes(id)) {
      e621User = await getE621User(availableIds[0]);
    } else {
      e621User = await getE621User(id);
    }

    if (!e621User) {
      return interaction.editReply("Couldn't figure out what your name was. Please contact an administrator.");
    }

    const guild = await client.guilds.fetch(config.DISCORD_GUILD_ID!);

    if (!guild) {
      return interaction.editReply('An error has occurred. Please try again later.');
    }

    const member = await guild.members.fetch(interaction.user.id);

    if (!member || !guild.members.me) {
      return interaction.editReply('An error has occurred. Please try again later.');
    }

    if (member.roles.highest.comparePositionTo(guild.members.me.roles.highest) > 0) {
      return interaction.editReply('I am unable to set your nickname as your role is higher than mine.');
    }

    await member.setNickname(e621User.name);
    interaction.editReply(`Nickname set to: ${e621User.name}`);
  }
};