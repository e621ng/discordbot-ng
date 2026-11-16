import { ApplicationIntegrationType, AutocompleteInteraction, ChatInputCommandInteraction, Client, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Database } from '../shared/Database';
import { Command, TicketPhrase } from '../types';
import { logCustomEvent, SetSeverity } from '../utils';

const MIN_PHRASE_LENGTH = 1;
const MAX_PHRASE_LENGTH = 512;

async function handlePhraseAdd(context: Client<boolean>, interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const guild = await context.guilds.fetch(interaction.guildId);

  const group = interaction.options.getSubcommandGroup();
  const phrase = interaction.options.getString('phrase', true);

  await Database.putTicketPhrase(group == 'admin' ? 'admin' : interaction.user.id, phrase);

  await logCustomEvent(guild, {
    title: 'Ticket Phrase Added',
    description: null,
    color: 0x00FF00,
    timestamp: new Date(),
    fields: [
      { name: 'User', value: interaction.user.tag, inline: true },
      { name: 'Type', value: group == 'admin' ? 'Admin ' : 'Personal', inline: true },
      { name: 'Phrase', value: phrase, inline: false },
    ],
  });

  await interaction.editReply({
    embeds: [{
      ...SetSeverity('success'),
      title: 'Phrase Added',
      fields: [
        { name: 'Phrase', value: phrase, inline: false },
        { name: 'Alerts', value: group == 'admin' ? 'admins' : 'you', inline: false },
      ]
    }]
  });
}

async function handlePhraseList(context: Client<boolean>, interaction: ChatInputCommandInteraction) {
  const group = interaction.options.getSubcommandGroup();

  const phrases = await Database.getTicketPhrasesFor(group == 'admin' ? 'admin' : interaction.user.id);
  if (phrases.length == 0) throw new Error("There aren't any phrases currently registered.");

  await interaction.editReply({
    embeds: [{
      ...SetSeverity('info'),
      description: `The following phrases are registered:\n\n${phrases.map(p => (`- \`${p.phrase}\``)).join('\n')}`,
    }],
  });
}

async function handlePhraseRemove(context: Client<boolean>, interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const guild = await context.guilds.fetch(interaction.guildId);

  const group = interaction.options.getSubcommandGroup();
  const phraseId = interaction.options.getNumber('phrase', true);

  const phrase = await Database.getTicketPhrase(phraseId);
  if (!phrase) throw new Error('There is no phrase with that ID.');

  await Database.removeTicketPhrase(phraseId);

  await logCustomEvent(guild, {
    title: 'Ticket Phrase Removed',
    description: null,
    color: 0xFF0000,
    timestamp: new Date(),
    fields: [
      { name: 'User', value: `<@${interaction.user.id}>\n${interaction.user.username}`, inline: true },
      { name: 'Type', value: group == 'admin' ? 'Admin ' : 'Personal', inline: true },
      { name: 'Phrase', value: phrase.phrase, inline: true },
    ],
  });

  await interaction.editReply({
    embeds: [{
      ...SetSeverity('success'),
      description: `The phrase will no longer alert ${group == 'admin' ? 'admins' : 'you'}.`,
    }],
  });
}

async function handlePhraseDump(context: Client<boolean>, interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const settings = await Database.getOrCreateSettings(interaction.guildId);

  let content = '';
  await Database.getAllTicketPhrases((phrase: TicketPhrase) => {
    if (phrase.user_id == 'admin' && (!settings.admin_role_id)) return;

    const mention = phrase.user_id == 'admin' ? `<@&${settings.admin_role_id}>` : `<@${phrase.user_id}>`;
    content += `${mention}: \`${phrase.phrase}\`\n`;
  });

  if (content.length == 0) throw new Error('There are no phrases to dump.');

  await interaction.editReply({
    embeds: [{
      ...SetSeverity('info'),
      description: `The following phrases are registered:\n\n${content}`,
    }],
  });
}

async function handlePhrasePurge(context: Client<boolean>, interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const guild = await context.guilds.fetch(interaction.guildId);

  const user = interaction.options.getUser('user', true);

  const phrases: TicketPhrase[] = await Database.getTicketPhrasesFor(user.id);
  const count = await Database.removeAllTicketPhrasesFor(user.id);

  await logCustomEvent(guild, {
    title: 'Ticket Phrases Purged',
    description: null,
    color: 0xFF0000,
    timestamp: new Date(),
    fields: [
      { name: 'User', value: `<@${interaction.user.id}>\n${interaction.user.username}`, inline: true },
      { name: 'Target User', value: `<@${user.id}>\n${user.username}`, inline: true },
      { name: 'Count', value: count.toString(), inline: true },
    ],
  });

  await interaction.editReply({
    embeds: [{
      ...SetSeverity('success'),
      description: `Purged the following phrases (${count}):\n${phrases.map(p => `- \`${p.phrase}\``).join('\n')}`,
    }],
  });
}

class PhrasesCommand implements Command<Client<boolean>> {
  data = new SlashCommandBuilder()
    .setName('phrases')
    .setDescription('Manage notified phrases.')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addSubcommandGroup(subcommandGroup =>
      subcommandGroup
        .setName('admin')
        .setDescription('Manage admin notified phrases.')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Add an admin notification phrase.')
            .addStringOption(option =>
              option
                .setName('phrase')
                .setDescription('The phrase to add.')
                .setRequired(true)
                .setMinLength(MIN_PHRASE_LENGTH)
                .setMaxLength(MAX_PHRASE_LENGTH)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Remove an admin notification phrase.')
            .addNumberOption(option =>
              option
                .setName('phrase')
                .setDescription('The phrase to remove.')
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('list')
            .setDescription('Get a list of the current admin notification phrases.')
        )
    )
    .addSubcommandGroup(subcommandGroup =>
      subcommandGroup
        .setName('personal')
        .setDescription('Manage personal notified phrases.')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Add a personal notification phrase.')
            .addStringOption(option =>
              option
                .setName('phrase')
                .setDescription('The phrase to add.')
                .setRequired(true)
                .setMinLength(MIN_PHRASE_LENGTH)
                .setMaxLength(MAX_PHRASE_LENGTH)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Remove a personal notification phrase.')
            .addNumberOption(option =>
              option
                .setName('phrase')
                .setDescription('The phrase to remove.')
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('list')
            .setDescription('Get a list of the current personal notification phrases.')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('dump')
        .setDescription('List all notification phrases.')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('purge')
        .setDescription("Purge a user's phrases.")
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to purge the phrases of.')
            .setRequired(true)
        )
    );

  async handleCommand(context: Client<boolean>, interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inGuild()) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const subcommand = interaction.options.getSubcommand();

      switch (subcommand) {
        case 'add': return await handlePhraseAdd(context, interaction);
        case 'list': return await handlePhraseList(context, interaction);
        case 'remove': return await handlePhraseRemove(context, interaction);

        case 'dump': return await handlePhraseDump(context, interaction);
        case 'purge': return await handlePhrasePurge(context, interaction);
      }
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }

  async handleAutocomplete(context: Client<boolean>, interaction: AutocompleteInteraction): Promise<void> {
    const group = interaction.options.getSubcommandGroup();
    if (!group) return interaction.respond([]);

    const value = interaction.options.getFocused();
    const phrases = await Database.getTicketPhrasesFor(group == 'admin' ? 'admin' : interaction.user.id);

    const toRespond = phrases.filter(p => !value ? true : p.phrase.includes(value));
    if (toRespond.length > 25) toRespond.length = 25;

    await interaction.respond(
      toRespond.map(p => ({
        name: p.phrase,
        value: p.id
      }))
    );
  }
}

export default new PhrasesCommand();
