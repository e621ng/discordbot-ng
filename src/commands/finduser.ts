import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, GuildBasedChannel, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Database } from '../shared/Database';
import { channelIsInStaffCategory, deferInteraction, getDiscordAlts, getE621User } from '../utils';
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
        .setName('user')
        .setDescription('The e621 username or e621 id to find the discord user of.')
        .setRequired(true)
    ),
  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    await deferInteraction(interaction);

    if (!interaction.guild) return interaction.editReply('This command must be used in a server');

    const user = interaction.options.getString('user', true);

    try {
      const e621User = await getE621User(user);

      if (!e621User) {
        return interaction.editReply('I got lost along the way. Who again?');
      }

      const content = await getDiscordAlts(e621User.id, interaction.guild, 1, [e621User.id]);

      interaction.editReply(`[${e621User.name}](${config.E621_BASE_URL}/users/${e621User.id})<${e621User.id}>'s e621 and discord account(s):\n${content}`);
    } catch (e) {
      console.error(e);

      interaction.editReply('I got lost in the net.');
    }
  }
};