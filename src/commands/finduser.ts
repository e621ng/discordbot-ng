import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Database } from '../shared/Database';
import { getE621User } from '../utils';
import { config } from '../config';

export default {
  name: 'finduser',
  data: new SlashCommandBuilder()
    .setName('finduser')
    .setDescription("Find a user's discord account based on their e621 usernamename or id.")
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(option =>
      option
        .setName('username')
        .setDescription('The e621 username to find the discord user of.')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('id')
        .setDescription('The e621 user id to find the discord user of.')
        .setRequired(false)
    ),
  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    const username = interaction.options.getString('username');
    const id = interaction.options.getString('id');

    if (!username && !id) {
      return interaction.reply({ content: 'No username or id given.', flags: [MessageFlags.Ephemeral] });
    }

    try {
      const e621User = await getE621User((id ?? username) as string);

      if (!e621User) {
        return interaction.reply('I got lost along the way. Who again?');
      }

      const results = await Database.getDiscordIds(e621User.id);

      const mappedResults = results.map(id => `- <@${id}>\n`);
      interaction.reply(`[${e621User.name}](${config.E621_BASE_URL}/users/${e621User.id})<${e621User.id}>'s discord account(s):\n${mappedResults}`);
    } catch (e) {
      console.error(e);

      interaction.reply('I got lost in the net.');
    }
  }
};