import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, InteractionContextType, MessageFlags, MessageMentions, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { config } from '../config';
import { Database } from '../shared/Database';
import { logCustomEvent, resolveUser } from '../utils';

const mentionRegex = new RegExp(MessageMentions.UsersPattern);

export default {
  name: 'link',
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Manually link discord users and e621 users.')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a link.')
        .addStringOption(option =>
          option
            .setName('discord-user')
            .setDescription('The discord user id, or mention, of the user.')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('e621-id')
            .setDescription('The id of the e621 user.')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a link.')
        .addStringOption(option =>
          option
            .setName('discord-user')
            .setDescription('The discord user id, or mention, of the user.')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('e621-id')
            .setDescription('The id of the e621 user.')
            .setRequired(true)
        )
    ),
  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const subcommand = await interaction.options.getSubcommand(true);

    const discordUserInput = interaction.options.getString('discord-user', true);

    const matches = mentionRegex.exec(discordUserInput);
    mentionRegex.lastIndex = 0;

    const idToUse = matches ? matches.groups!.id : discordUserInput;

    const user = await resolveUser(client, idToUse, interaction.guild);

    if (!user) return interaction.editReply('User not found.');

    const e621Id = interaction.options.getInteger('e621-id', true);

    if (subcommand == 'create') {
      const existingLinks = await Database.getDiscordIds(e621Id);

      if (existingLinks.includes(user.id)) return interaction.editReply('Accounts already linked.');

      await Database.putUser(e621Id, user);

      await logCustomEvent(interaction.guild!, {
        title: 'Account Link Created',
        description: null,
        color: 0x00FF00,
        timestamp: new Date(),
        fields: [
          {
            name: 'Admin',
            value: `<@${interaction.user.id}>\n${interaction.user.username}`,
            inline: true
          },
          {
            name: 'Discord User',
            value: `<@${user.id}>\n${user.username}`,
            inline: true
          },
          {
            name: 'E621 User',
            value: `${config.E621_BASE_URL}/users/${e621Id}`,
            inline: true
          }
        ]
      });

      interaction.editReply('Accounts linked');
    } else if (subcommand == 'remove') {
      const existingLinks = await Database.getDiscordIds(e621Id);

      if (!existingLinks.includes(user.id)) return interaction.editReply('Accounts not linked.');

      await Database.removeUser(e621Id, user.id);

      await logCustomEvent(interaction.guild!, {
        title: 'Account Link Removed',
        description: null,
        color: 0x00FF00,
        timestamp: new Date(),
        fields: [
          {
            name: 'Admin',
            value: `<@${interaction.user.id}>\n${interaction.user.username}`,
            inline: true
          },
          {
            name: 'Discord User',
            value: `<@${user.id}>\n${user.username}`,
            inline: true
          },
          {
            name: 'E621 User',
            value: `${config.E621_BASE_URL}/users/${e621Id}`,
            inline: true
          }
        ]
      });

      interaction.editReply('Accounts unlinked');
    }
  }
};