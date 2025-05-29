import { ApplicationIntegrationType, AutocompleteInteraction, ChatInputCommandInteraction, Client, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Database } from '../shared/Database';
import { getE621User } from '../utils';
import { config } from '../config';
import { TicketPhrase } from '../types';

const MIN_PHRASE_LENGTH = 1;
const MAX_PHRASE_LENGTH = 512;

type SubcommandGroup = 'admin' | 'personal';
type Subcommand = 'add' | 'remove' | 'list' | 'dump';

export default {
  name: 'phrases',
  data: new SlashCommandBuilder()
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
    ),
  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    const subcommandGroup: SubcommandGroup | null = interaction.options.getSubcommandGroup() as SubcommandGroup;
    const subcommand: Subcommand | null = interaction.options.getSubcommand() as Subcommand;
    if (subcommand == 'dump') {
      return dumpPhrases(interaction);
    }

    switch (subcommand) {
      case 'add':
        return addPhrase(interaction, interaction.options.getString('phrase', true), subcommandGroup!);
      case 'remove':
        return removePhrase(interaction, interaction.options.getNumber('phrase', true), subcommandGroup!);
      case 'list':
        return listPhrases(interaction, subcommandGroup!);
    }
  },
  autoComplete: async function (client: Client, interaction: AutocompleteInteraction) {
    const subcommandGroup: SubcommandGroup | null = interaction.options.getSubcommandGroup() as SubcommandGroup;

    if (!subcommandGroup) return interaction.respond([]);

    const value = interaction.options.getFocused();

    const phrases: TicketPhrase[] = await Database.getTicketPhrasesFor(subcommandGroup == 'admin' ? 'admin' : interaction.user.id);

    const toRespond = phrases.filter(p => !value ? true : p.phrase.includes(value));
    if (toRespond.length > 25) toRespond.length = 25;

    interaction.respond(toRespond.map(p => ({
      name: p.phrase,
      value: p.id
    })));
  }
};

async function dumpPhrases(interaction: ChatInputCommandInteraction) {
  let content = '';

  const guildSettings = await Database.getGuildSettings(interaction.guildId!);

  await Database.getAllTicketPhrases((phrase: TicketPhrase) => {
    if (phrase.user_id == 'admin' && (!guildSettings || !guildSettings.admin_role_id)) return;

    const mention = phrase.user_id == 'admin' ? `<@&${guildSettings?.admin_role_id}>` : `<@${phrase.user_id}>`;

    content += `${mention}: \`${phrase.phrase}\`\n`;
  });

  if (content.length == 0) return interaction.reply('No phrases found.');

  interaction.reply('The following phrases are registered:\n\n' + content);
}

async function addPhrase(interaction: ChatInputCommandInteraction, phrase: string, group: SubcommandGroup) {
  await Database.putTicketPhrase(group == 'admin' ? 'admin' : interaction.user.id, phrase);
  interaction.reply(`Phrases matching "${phrase}" will now alert ${group == 'admin' ? 'admins' : 'you'}.`);
}

async function removePhrase(interaction: ChatInputCommandInteraction, phraseId: number, group: SubcommandGroup) {
  await Database.removeTicketPhrase(phraseId);
  interaction.reply(`Phrase will no longer alert ${group == 'admin' ? 'admins' : 'you'}.`);
}

async function listPhrases(interaction: ChatInputCommandInteraction, group: SubcommandGroup) {
  const phrases = await Database.getTicketPhrasesFor(group == 'admin' ? 'admin' : interaction.user.id);

  if (phrases.length == 0) return interaction.reply('No phrases registered');

  interaction.reply(`The following phrases are registered:\n\n${phrases.map(p => (`- \`${p.phrase}\``)).join('\n')}`);
}