import { ApplicationCommandOptionType, ApplicationIntegrationType, AutocompleteInteraction, ChatInputCommandInteraction, Client, GuildBasedChannel, InteractionContextType, MessageFlags, MessageMentions, PermissionFlagsBits, SlashCommandBuilder, User } from 'discord.js';
import { Database } from '../shared/Database';
import { channelIsInStaffCategory, deferInteraction, logCustomEvent, resolveUser } from '../utils';
import { getNoteMessage } from '../utils/note-utils';

const mentionRegex = new RegExp(MessageMentions.UsersPattern);

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
        .addStringOption(option =>
          option
            .setName('user')
            .setDescription('The discord user mention, or ID, to add a note to.')
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
        .setName('edit')
        .setDescription('Edit notes on a user.')
        .addStringOption(option =>
          option
            .setName('user')
            .setDescription('The discord user mention, or ID, to edit the notes of.')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('note')
            .setDescription('The note to edit.')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('new-reason')
            .setDescription('The new reason for the note.')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove notes from a user.')
        .addStringOption(option =>
          option
            .setName('user')
            .setDescription('The discord user mention, or ID, to remove a note from.')
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
        .addStringOption(option =>
          option
            .setName('user')
            .setDescription('The discord user mention, or ID, to list the notes of.')
            .setRequired(true)
        )
    ),
  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand(true);

    const input = interaction.options.getString('user', true);

    const matches = mentionRegex.exec(input);
    mentionRegex.lastIndex = 0;

    const idToUse = matches ? matches.groups!.id : input;

    await deferInteraction(interaction);

    const user = await resolveUser(client, idToUse);

    if (!user) return interaction.editReply('User not found.');

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

      await Database.putNote(idToUse, reason, interaction.user.id);

      interaction.editReply(`Note added to <@${idToUse}>.\n\nReason:\n${reason}`);
    } else if (subcommand == 'remove') {
      const noteId = interaction.options.getInteger('note', true);

      const notes = await Database.getNotes(idToUse);
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
    } else if (subcommand == 'edit') {
      const noteId = interaction.options.getInteger('note', true);

      const notes = await Database.getNotes(idToUse);
      const note = notes.find(n => n.id == noteId);

      if (!note) return interaction.editReply('Note not found.');

      const reason = interaction.options.getString('new-reason', true);

      logCustomEvent(interaction.guild!, {
        title: 'Note Edited',
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
            name: 'Old reason',
            value: note.reason
          },
          {
            name: 'New reason',
            value: reason,
            inline: true
          }
        ]
      });

      await Database.editNote(noteId, note.reason, reason, interaction.user.id);

      interaction.editReply(`Note on <@${idToUse}> edited.\n\nNew reason:\n${reason}`);
    } else if (subcommand == 'list') {
      const noteMessage = await getNoteMessage(idToUse, 1);

      if (!noteMessage) return interaction.editReply(`No notes found for <@${idToUse}>`);

      interaction.editReply(noteMessage);
    }
  },
  autoComplete: async function (client: Client, interaction: AutocompleteInteraction) {
    const input = interaction.options.getString('user', true);

    const matches = mentionRegex.exec(input);
    mentionRegex.lastIndex = 0;

    const idToUse = matches ? matches.groups!.id : input;

    if (!idToUse) return interaction.respond([]);

    const value = interaction.options.getFocused().toLowerCase();

    const notes = await Database.getNotes(idToUse);

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