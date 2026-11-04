import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Database } from '../shared/Database';
import { getIdFromInput, SetSeverity } from '../utils';

const userRegex = new RegExp(/^\d{16,20}$/);

async function addUserMapping(interaction: ChatInputCommandInteraction) {
  const githubUsername = interaction.options.getString('github-name', true);
  const discordId = getIdFromInput(interaction.options.getString('discord-user', true));
  if (!userRegex.test(discordId)) throw new Error('The provided Discord user ID is invalid.');

  const existingMappingId = await Database.getGithubFromDiscordId(discordId);
  const existingMappingName = await Database.getDiscordIdFromGithub(githubUsername);

  if (existingMappingId) throw new Error(`<@${discordId}> (${discordId}) is already mapped to \`${existingMappingId}\``);
  if (existingMappingName) throw new Error(`\`${githubUsername}\` is already mapped to <@${existingMappingName}> (${existingMappingName})`);

  await Database.putGithubUserMapping(discordId, githubUsername);

  await interaction.editReply({
    embeds: [{
      ...SetSeverity('success'),

      title: 'GitHub/Discord Mapping | Add',
      description: `\`${githubUsername}\` has been linked to <@${discordId}>`,
    }],
  });
}

async function removeUserMapping(interaction: ChatInputCommandInteraction) {
  const discordId = getIdFromInput(interaction.options.getString('discord-user', true));
  if (!userRegex.test(discordId)) throw new Error('The provided Discord user ID is invalid.');

  const existingMappingId = await Database.getGithubFromDiscordId(discordId);
  if (!existingMappingId) throw new Error(`<@${discordId}> (${discordId}) isn't mapped to a GitHub username.`);

  await Database.removeGithubUserMapping(discordId);

  await interaction.editReply({
    embeds: [{
      ...SetSeverity('success'),

      title: 'GitHub/Discord Mapping | Remove',
      description: `\`${existingMappingId}\` has been unlinked from <@${discordId}>`,
    }],
  });
}

async function listUserMapping(interaction: ChatInputCommandInteraction) {
  const allMappings = await Database.getAllGithubUserMappings();
  if (allMappings.length < 1) throw new Error('No GitHub mappings have been configured.');

  await interaction.editReply({
    embeds: [{
      ...SetSeverity('success'),

      title: 'GitHub/Discord Mapping | List',
      description: allMappings.map(m => `- <@${m.discord_id}> (${m.discord_id}) - ${m.github_username}`).join('\n'),
    }]
  });
}

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
    if (!interaction.inGuild()) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      switch (interaction.options.getSubcommand(true)) {
        case 'add': return await addUserMapping(interaction);
        case 'remove': return await removeUserMapping(interaction);
        case 'list': return await listUserMapping(interaction);
      }
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }
};
