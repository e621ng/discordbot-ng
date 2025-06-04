import { ApplicationIntegrationType, BitFieldResolvable, ChatInputCommandInteraction, Client, GuildBasedChannel, InteractionContextType, MessageFlags, MessageMentions, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { channelIsInStaffCategory, handleWhoIsInteraction } from '../utils';

const mentionRegex = new RegExp(MessageMentions.UsersPattern);

export default {
  name: 'whois',
  data: new SlashCommandBuilder()
    .setName('whois')
    .setDescription("Find a user's e621 account from their discord account, or vice versa.")
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(option =>
      option
        .setName('user')
        .setDescription('The discord user mention, or ID to find the e621 user of.')
        .setRequired(true)
    ),
  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    const input = interaction.options.getString('user', true);

    const matches = mentionRegex.exec(input);
    mentionRegex.lastIndex = 0;

    const idToUse = matches ? matches.groups!.id : input;

    handleWhoIsInteraction(interaction, idToUse, !(await channelIsInStaffCategory(interaction.channel as GuildBasedChannel)));
  }
};