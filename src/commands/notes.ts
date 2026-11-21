import { ApplicationIntegrationType, AutocompleteInteraction, ChatInputCommandInteraction, Client, InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Database } from '../shared/Database';
import { deferInteraction, getIdFromInput, getNoteMessage, logCustomEvent, resolveUser, SetSeverity } from '../utils';

async function handleNotesAdd(client: Client, interaction: ChatInputCommandInteraction) {
  const idToUse = getIdFromInput(interaction.options.getString('user', true));
  const user = await resolveUser(client, idToUse, interaction.guild);
  if (!user) throw new Error('An error occured while trying to resolve the user.');

  const reason = interaction.options.getString('reason', true);

  await Database.putNote(user.id, reason, interaction.user.id);

  await logCustomEvent(interaction.guild!, {
    title: 'Note Added',
    description: null,
    color: 0x00FF00,
    timestamp: new Date(),
    fields: [
      { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: false },
      { name: 'User', value: `<@${user.id}>`, inline: false },
      { name: 'Note', value: reason, inline: false },
    ],
  });

  await interaction.editReply({
    embeds: [{
      ...SetSeverity('success'),
      description: 'The note was successfully added.',
      fields: [
        { name: 'User', value: `${user}`, inline: false },
        { name: 'Reason', value: reason, inline: false },
      ],
    }],
  });
}

async function handleNotesEdit(client: Client, interaction: ChatInputCommandInteraction) {
  const idToUse = getIdFromInput(interaction.options.getString('user', true));
  const user = await resolveUser(client, idToUse, interaction.guild);
  if (!user) throw new Error('An error occured while trying to resolve the user.');

  const noteId = interaction.options.getInteger('note', true);

  const notes = await Database.getNotes(user.id);
  const note = notes.find(n => n.id == noteId);
  if (!note) {
    await interaction.editReply({
      embeds: [{
        ...SetSeverity('warning'),
        description: "The note you're trying to edit doesn't exist.",
      }],
    });

    return;
  }

  const reason = interaction.options.getString('new-reason', true);

  await Database.editNote(noteId, note.reason, reason, interaction.user.id);

  await logCustomEvent(interaction.guild!, {
    title: 'Note Edited',
    description: null,
    color: 0x00FF00,
    timestamp: new Date(),
    fields: [
      { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: false },
      { name: 'User', value: `<@${user.id}>`, inline: false },
      { name: 'Old reason', value: note.reason, inline: false },
      { name: 'New reason', value: reason, inline: false },
    ],
  });

  await interaction.editReply({
    embeds: [{
      ...SetSeverity('success'),
      description: 'The note was successfully edited.',
      fields: [
        { name: 'User', value: `${user}`, inline: false },
        { name: 'Old Reason', value: note.reason, inline: false },
        { name: 'New Reason', value: reason, inline: false },
      ],
    }],
  });
}

async function handleNotesList(client: Client, interaction: ChatInputCommandInteraction) {
  const idToUse = getIdFromInput(interaction.options.getString('user', true));
  const user = await resolveUser(client, idToUse, interaction.guild);
  if (!user) throw new Error('An error occured while trying to resolve the user.');

  const message = await getNoteMessage(user.id, 1);
  if (!message) {
    await interaction.editReply({
      embeds: [{
        ...SetSeverity('warning'),
        description: `No notes were found for ${user}.`,
      }],
    });

    return;
  }

  await interaction.editReply(message);
}

async function handleNotesRemove(client: Client, interaction: ChatInputCommandInteraction) {
  const idToUse = getIdFromInput(interaction.options.getString('user', true));
  const user = await resolveUser(client, idToUse, interaction.guild);
  if (!user) throw new Error('An error occured while trying to resolve the user.');

  const noteId = interaction.options.getInteger('note', true);

  const notes = await Database.getNotes(user.id);
  const note = notes.find(n => n.id == noteId);
  if (!note) {
    await interaction.editReply({
      embeds: [{
        ...SetSeverity('warning'),
        description: "The note you're trying to remove doesn't exist.",
      }],
    });

    return;
  }

  await Database.removeNote(noteId);

  await logCustomEvent(interaction.guild!, {
    title: 'Note Removed',
    description: null,
    color: 0xFF0000,
    timestamp: new Date(),
    fields: [
      { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: false },
      { name: 'User', value: `<@${user.id}>`, inline: false },
      { name: 'Author', value: `<@${note.mod_id}>`, inline: false },
      { name: 'Note', value: note.reason, inline: false },
    ],
  });

  await interaction.editReply({
    embeds: [{
      ...SetSeverity('success'),
      description: `The note has been removed from ${user} successfully.`,
    }],
  });
}

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
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('The reason for the note.')
            .setRequired(true)
            .setMaxLength(1024)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('edit')
        .setDescription('Edit notes on a user.')
        .addStringOption(option =>
          option
            .setName('user')
            .setDescription('The discord user mention, or ID, to edit the notes of.')
            .setRequired(true))
        .addIntegerOption(option =>
          option
            .setName('note')
            .setDescription('The note to edit.')
            .setRequired(true)
            .setAutocomplete(true))
        .addStringOption(option =>
          option
            .setName('new-reason')
            .setDescription('The new reason for the note.')
            .setRequired(true)
            .setMaxLength(1024)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove notes from a user.')
        .addStringOption(option =>
          option
            .setName('user')
            .setDescription('The discord user mention, or ID, to remove a note from.')
            .setRequired(true))
        .addIntegerOption(option =>
          option
            .setName('note')
            .setDescription('The note to remove.')
            .setRequired(true)
            .setAutocomplete(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription("List a user's notes")
        .addStringOption(option =>
          option
            .setName('user')
            .setDescription('The discord user mention, or ID, to list the notes of.')
            .setRequired(true))),

  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    await deferInteraction(interaction);

    const subcommand = interaction.options.getSubcommand(true);
    try {
      switch (subcommand) {
        case 'add': return await handleNotesAdd(client, interaction);
        case 'edit': return await handleNotesEdit(client, interaction);
        case 'list': return await handleNotesList(client, interaction);
        case 'remove': return await handleNotesRemove(client, interaction);
      }
    } catch (error: Error | any) {
      await interaction.editReply({ embeds: [{ ...SetSeverity('error'), description: error.message }] }).catch(() => {});
    }
  },

  autoComplete: async function (client: Client, interaction: AutocompleteInteraction) {
    const idToUse = getIdFromInput(interaction.options.getString('user', true));
    if (!idToUse) return await interaction.respond([]);

    const value = interaction.options.getFocused().toLowerCase();
    const notes = await Database.getNotes(idToUse);

    const toRespond = notes.filter(w => !value ? true : w.reason.toLowerCase().includes(value));
    if (toRespond.length > 25) toRespond.length = 25;

    await interaction.respond(
      toRespond.map((w) => {
        return {
          name: w.reason.substring(0, 50),
          value: w.id
        };
      })
    );
  }
};
