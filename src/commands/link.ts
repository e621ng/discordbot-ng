import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { config } from '../config';
import { Database } from '../shared/Database';
import { deferInteraction, getIdFromInput, logCustomEvent, resolveUser, SetSeverity } from '../utils';

async function handleLinkCreate(client: Client, interaction: ChatInputCommandInteraction) {
  const idToUse = getIdFromInput(interaction.options.getString('discord-user', true));
  const user = await resolveUser(client, idToUse, interaction.guild);
  if (!user) {
    await interaction.editReply({
      embeds: [{
        ...SetSeverity('error'),
        description: "Couldn't resolve the specified Discord user.",
      }],
    });
    return;
  }

  const e621Id = interaction.options.getInteger('e621-id', true);

  const existingLinks = await Database.getDiscordIds(e621Id);
  if (existingLinks.includes(user.id)) {
    await interaction.editReply({
      embeds: [{
        ...SetSeverity('warning'),
        description: 'The specified accounts are already linked.',
      }],
    });

    return;
  }

  await Database.putUser(e621Id, user);

  await logCustomEvent(interaction.guild!, {
    title: 'Account Link Created',
    description: null,
    color: 0x00FF00,
    timestamp: new Date(),
    fields: [
      { name: 'Admin', value: `${interaction.user} (${interaction.user.id})`, inline: false },
      { name: 'Discord User', value: `${user} (${user.id})`, inline: false },
      { name: 'E621 User', value: `${config.E621_BASE_URL}/users/${e621Id}`, inline: false },
    ],
  });

  await interaction.editReply({
    embeds: [{
      ...SetSeverity('success'),
      description: `${user.tag} has been successfully linked to [#${e621Id}](${config.E621_BASE_URL}/users/${e621Id}).`,
    }],
  });
}

async function handleLinkRemove(client: Client, interaction: ChatInputCommandInteraction) {
  const idToUse = getIdFromInput(interaction.options.getString('discord-user', true));
  const user = await resolveUser(client, idToUse, interaction.guild);
  if (!user) {
    await interaction.editReply({
      embeds: [{
        ...SetSeverity('error'),
        description: "Couldn't resolve the specified Discord user.",
      }],
    });
    return;
  }

  const e621Id = interaction.options.getInteger('e621-id', true);

  const existingLinks = await Database.getDiscordIds(e621Id);
  if (!existingLinks.includes(user.id)) {
    await interaction.editReply({
      embeds: [{
        ...SetSeverity('warning'),
        description: "The specified accounts aren't linked.",
      }],
    });

    return;
  }

  await Database.removeUser(e621Id, user.id);

  await logCustomEvent(interaction.guild!, {
    title: 'Account Link Removed',
    description: null,
    color: 0xFF0000,
    timestamp: new Date(),
    fields: [
      { name: 'Admin', value: `${interaction.user} (${interaction.user.id})`, inline: false },
      { name: 'Discord User', value: `${user} (${user.id})`, inline: false },
      { name: 'E621 User', value: `${config.E621_BASE_URL}/users/${e621Id}`, inline: false },
    ],
  });

  await interaction.editReply({
    embeds: [{
      ...SetSeverity('success'),
      description: `${user.tag} has been successfully unlinked from [#${e621Id}](${config.E621_BASE_URL}/users/${e621Id}).`,
    }],
  });
}

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
    await deferInteraction(interaction);

    const subcommand = interaction.options.getSubcommand(true);
    switch (subcommand) {
      case 'create': return await handleLinkCreate(client, interaction);
      case 'remove': return await handleLinkRemove(client, interaction);
    }
  }
};
