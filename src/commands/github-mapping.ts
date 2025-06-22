import { ApplicationIntegrationType, BitFieldResolvable, ChatInputCommandInteraction, Client, GuildBasedChannel, InteractionContextType, MessageFlags, MessageMentions, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { channelIsInStaffCategory, handleWhoIsInteraction } from '../utils';
import { Database } from '../shared/Database';

const mentionRegex = new RegExp(MessageMentions.UsersPattern);

export default {
  name: 'github-mapping',
  data: new SlashCommandBuilder()
    .setName('github-mapping')
    .setDescription('Maps github users to discord ids for releases.')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a user mapping.')
        .addStringOption(option =>
          option
            .setName('discord-user')
            .setDescription('The discord user id, or mention, of the user.')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('github-name')
            .setDescription('The github username of the user (case sensitive).')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a user mapping.')
        .addStringOption(option =>
          option
            .setName('discord-user')
            .setDescription('The discord user id, or mention, of the user.')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all github-discord mappings.')
    ),
  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const subcommand = await interaction.options.getSubcommand(true);

    if (subcommand == 'add') {
      const discordUserInput = interaction.options.getString('discord-user', true);

      const matches = mentionRegex.exec(discordUserInput);
      mentionRegex.lastIndex = 0;

      const idToUse = matches ? matches.groups!.id : discordUserInput;

      const githubName = interaction.options.getString('github-name', true);

      const existingMappingId = await Database.getGithubFromDiscordId(idToUse);
      const existingMappingName = await Database.getDiscordIdFromGithub(githubName);

      if (existingMappingId) return interaction.editReply(`Discord user id is already mapped to ${existingMappingId}`);
      if (existingMappingName) return interaction.editReply(`Github username is already mapped to <@${existingMappingName}> (${existingMappingName})`);

      Database.putGithubUserMapping(idToUse, githubName);

      return interaction.editReply('Mapping added.');
    } else if (subcommand == 'remove') {
      const discordUserInput = interaction.options.getString('discord-user', true);

      const matches = mentionRegex.exec(discordUserInput);
      mentionRegex.lastIndex = 0;

      const idToUse = matches ? matches.groups!.id : discordUserInput;

      Database.removeGithubUserMapping(idToUse);
      return interaction.editReply('Mapping removed.');
    } else if (subcommand == 'list') {
      const allMappings = await Database.getAllGithubUserMappings();

      return interaction.editReply(allMappings.map(m => `- <@${m.discord_id}> (${m.discord_id}) - ${m.github_username}`).join('\n'));
    }
  }
};