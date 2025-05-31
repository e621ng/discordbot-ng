import { ApplicationIntegrationType, BitFieldResolvable, ChatInputCommandInteraction, Client, GuildBasedChannel, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { channelIsInStaffCategory, handleWhoIsInteraction } from '../utils';
import { getRecordMessageFromDiscordId } from '../utils/record-utils';

export default {
  name: 'records',
  data: new SlashCommandBuilder()
    .setName('records')
    .setDescription("Get a user's on-site records.")
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
    const isStaffChannel = await channelIsInStaffCategory(interaction.channel as GuildBasedChannel);

    if (isStaffChannel) await interaction.deferReply();
    else await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    if (!interaction.guild) return interaction.editReply('This command must be used in a server');

    const user = interaction.options.getUser('user');
    const id = interaction.options.getString('id');

    if (!user && !id) {
      return interaction.reply({ content: 'No user or id given.', flags: [MessageFlags.Ephemeral] });
    }

    const idToUse = (user?.id ?? id) as string;

    const recordMessage = await getRecordMessageFromDiscordId(idToUse, 1, interaction.guild);

    if (!recordMessage) return interaction.editReply('No records found on any linked accounts.');

    interaction.editReply(recordMessage);
  }
};