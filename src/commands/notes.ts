import { ApplicationCommandOptionType, ApplicationIntegrationType, AutocompleteInteraction, ChatInputCommandInteraction, Client, GuildBasedChannel, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Database } from '../shared/Database';
import { channelIsInStaffCategory, deferInteraction, logCustomEvent } from '../utils';
import { getNoteMessage } from '../utils/note-utils';

export default {
  name: 'notes',
  data: new SlashCommandBuilder()
    .setName('notes')
    .setDescription('Add, view, or remove user notes.')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add notes to a user.')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to add a note to.')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('The reason for the note.')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove notes from a user.')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to remove a note from.')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('note')
            .setDescription('The note to remove.')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription("List a user's notes")
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to list the notes of.')
            .setRequired(true)
        )
    ),
  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand(true);
    const user = interaction.options.getUser('user', true);

    await deferInteraction(interaction);

    if (subcommand == 'add') {
      const reason = interaction.options.getString('reason', true);

      logCustomEvent(interaction.guild!, {
        title: 'Note Added',
        description: null,
        color: 0x00FF00,
        timestamp: new Date(),
        fields: [
          {
            name: 'User',
            value: `<@${interaction.user.id}>\n${interaction.user.username}`,
            inline: true
          },
          {
            name: 'Note',
            value: reason,
            inline: true
          }
        ]
      });

      await Database.putNote(user.id, reason, interaction.user.id);

      interaction.editReply(`Note added to ${user}.\n\nReason:\n${reason}`);
    } else if (subcommand == 'remove') {
      const user = interaction.options.getUser('user', true);
      const noteId = interaction.options.getInteger('note', true);

      const notes = await Database.getNotes(user.id);
      const note = notes.find(n => n.id == noteId);

      if (!note) return interaction.editReply('Note not found.');

      logCustomEvent(interaction.guild!, {
        title: 'Note Removed',
        description: null,
        color: 0xFF0000,
        timestamp: new Date(),
        fields: [
          {
            name: 'User',
            value: `<@${interaction.user.id}>\n${interaction.user.username}`,
            inline: true
          },
          {
            name: 'Note',
            value: `${note.reason}\nBy: <@${note.mod_id}>`,
            inline: true
          }
        ]
      });

      await Database.removeNote(noteId);
      interaction.editReply('Removed note.');
    } else if (subcommand == 'list') {
      const noteMessage = await getNoteMessage(user.id, 1);

      if (!noteMessage) return interaction.editReply(`No notes found for <@${user.id}>`);

      interaction.editReply(noteMessage);
    }
  },
  autoComplete: async function (client: Client, interaction: AutocompleteInteraction) {
    const user = interaction.options.get('user');

    if (!user || user.type != ApplicationCommandOptionType.User) return interaction.respond([]);

    const userId = user.value as string;

    const value = interaction.options.getFocused().toLowerCase();

    const notes = await Database.getNotes(userId);

    const toRespond = notes.filter(w => !value ? true : w.reason.toLowerCase().includes(value));
    if (toRespond.length > 25) toRespond.length = 25;

    interaction.respond(toRespond.map((w) => {
      return {
        name: w.reason.substring(0, 50),
        value: w.id
      };
    }));
  }
};