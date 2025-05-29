import { ApplicationCommandOptionType, ApplicationIntegrationType, AutocompleteInteraction, ChatInputCommandInteraction, Client, GuildBasedChannel, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Database } from '../shared/Database';
import { channelIsInStaffCategory, getE621User } from '../utils';
import { config } from '../config';
import { getWarningMessage } from '../utils/warning-utils';

export default {
  name: 'warnings',
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Add, view, or remove user warnings.')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add warnings to a user.')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to add a warning to.')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('The reason for the warning.')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove warnings from a user.')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to remove a warning from.')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('warning')
            .setDescription('The warning to remove.')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription("List a user's warnings")
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to list the warnings of.')
            .setRequired(true)
        )
    ),
  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand(true);
    const user = interaction.options.getUser('user', true);

    const isStaffChannel = await channelIsInStaffCategory(interaction.channel as GuildBasedChannel);

    if (isStaffChannel) await interaction.deferReply();
    else await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    if (subcommand == 'add') {
      const reason = interaction.options.getString('reason', true);

      await Database.putWarning(user.id, reason, interaction.user.id);

      if (isStaffChannel) interaction.editReply('Added warning.');
      else interaction.editReply({ content: 'Added warning.' });
    } else if (subcommand == 'remove') {
      const warningId = interaction.options.getInteger('warning', true);

      if (await Database.removeWarning(warningId)) {
        if (isStaffChannel) interaction.editReply('Removed warning.');
        else interaction.editReply({ content: 'Removed warning.' });
      } else {
        if (isStaffChannel) interaction.editReply('Warning not found.');
        else interaction.editReply({ content: 'Warning not found.' });
      }
    } else if (subcommand == 'list') {
      const warningMessage = await getWarningMessage(user.id, 1);

      if (!warningMessage) return interaction.editReply(`No warnings found for <@${user.id}>`);

      interaction.editReply(warningMessage);
    }
  },
  autoComplete: async function (client: Client, interaction: AutocompleteInteraction) {
    const user = interaction.options.get('user');

    if (!user || user.type != ApplicationCommandOptionType.User) return interaction.respond([]);

    const userId = user.value as string;

    const value = interaction.options.getFocused().toLowerCase();

    const warnings = await Database.getWarnings(userId);

    const toRespond = warnings.filter(w => !value ? true : w.reason.toLowerCase().includes(value));
    if (toRespond.length > 25) toRespond.length = 25;

    interaction.respond(toRespond.map((w) => {
      return {
        name: w.reason.substring(0, 50),
        value: w.id
      };
    }));
  }
};