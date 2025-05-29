import { ApplicationIntegrationType, BitFieldResolvable, ChatInputCommandInteraction, Client, GuildBasedChannel, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { channelIsInStaffCategory, handleWhoIsInteraction } from '../utils';

export default {
  name: 'whois',
  data: new SlashCommandBuilder()
    .setName('whois')
    .setDescription("Find a user's e621 account from their discord account, or vice versa.")
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The discord user to find the e621 user of.')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('id')
        .setDescription('The discord user id to find the e621 user of.')
        .setRequired(false)
    ),
  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user');
    const id = interaction.options.getString('id');

    if (!user && !id) {
      return interaction.reply({ content: 'No user or id given.', flags: [MessageFlags.Ephemeral] });
    }

    const idToUse = (user?.id ?? id) as string;

    handleWhoIsInteraction(interaction, idToUse, !(await channelIsInStaffCategory(interaction.channel as GuildBasedChannel)));
  }
};