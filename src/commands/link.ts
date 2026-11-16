import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { config } from '../config';
import { Database } from '../shared/Database';
import { Command } from '../types';
import { getIdFromInput, logCustomEvent, resolveUser, SetSeverity } from '../utils';

async function handleAccountLinked(context: Client<boolean>, interaction: ChatInputCommandInteraction) {
  const idToUse = getIdFromInput(interaction.options.getString('discord-user', true));
  const user = await resolveUser(context, idToUse, interaction.guild);
  if (!user) throw new Error('User not found.');

  const e621Id = interaction.options.getInteger('e621-id', true);
  const existingLinks = await Database.getDiscordIds(e621Id);
  if (existingLinks.includes(user.id)) throw new Error('Accounts already linked.');

  await Database.putUser(e621Id, user);
  await logCustomEvent(interaction.guild!, {
    title: 'Account Link Created',
    description: null,
    color: 0x00FF00,
    timestamp: new Date(),
    fields: [
      { name: 'Admin', value: `<@${interaction.user.id}>\n${interaction.user.username}`, inline: true },
      { name: 'Discord User', value: `<@${user.id}>\n${user.username}`, inline: true },
      { name: 'E621 User', value: `${config.E621_BASE_URL}/users/${e621Id}`, inline: true },
    ],
  });

  await interaction.editReply({
    embeds: [{
      ...SetSeverity('success'),
      description: 'The accounts have been linked.'
    }]
  });
}

async function handleAccountUnlinked(context: Client<boolean>, interaction: ChatInputCommandInteraction) {
  const idToUse = getIdFromInput(interaction.options.getString('discord-user', true));
  const user = await resolveUser(context, idToUse, interaction.guild);
  if (!user) throw new Error('User not found.');

  const e621Id = interaction.options.getInteger('e621-id', true);
  const existingLinks = await Database.getDiscordIds(e621Id);
  if (!existingLinks.includes(user.id)) throw new Error('Accounts not linked.');

  await Database.removeUser(e621Id, user.id);

  const guild = await context.guilds.fetch(interaction.guildId!);
  await logCustomEvent(guild, {
    title: 'Account Link Removed',
    description: null,
    color: 0x00FF00,
    timestamp: new Date(),
    fields: [
      { name: 'Admin', value: `<@${interaction.user.id}>\n${interaction.user.username}`, inline: true },
      { name: 'Discord User', value: `<@${user.id}>\n${user.username}`, inline: true },
      { name: 'E621 User', value: `${config.E621_BASE_URL}/users/${e621Id}`, inline: true },
    ],
  });

  await interaction.editReply({
    embeds: [{
      ...SetSeverity('success'),
      description: 'The accounts have been unlinked.'
    }]
  });
}

class LinkCommand implements Command<Client<boolean>> {
  data = new SlashCommandBuilder()
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
    );

  async handleCommand(context: Client<boolean>, interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inGuild()) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      switch (interaction.options.getSubcommand(true)) {
        case 'create': return await handleAccountLinked(context, interaction);
        case 'remove': return await handleAccountUnlinked(context, interaction);
      }
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }
}

export default new LinkCommand();
