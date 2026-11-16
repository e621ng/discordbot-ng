import { ApplicationIntegrationType, AutocompleteInteraction, ChatInputCommandInteraction, Client, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Database } from '../shared/Database';
import { Command } from '../types';
import { getIdFromInput, getNoteMessage, logCustomEvent, resolveUser, SetSeverity } from '../utils';

async function handleNoteAdd(context: Client<boolean>, interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const guild = await context.guilds.fetch(interaction.guildId);

  const input = getIdFromInput(interaction.options.getString('user', true));
  const user = await resolveUser(context, input, guild);
  if (!user) throw new Error('Unable to fetch a user with the given id.');

  const reason = interaction.options.getString('reason', true);

  await logCustomEvent(guild, {
    title: 'Note Added',
    description: null,
    color: 0x00FF00,
    timestamp: new Date(),
    fields: [
      { name: 'Moderator', value: `<@${interaction.user.id}>\n${interaction.user.username}`, inline: true },
      { name: 'User', value: `<@${user.id}>\n${user.username}`, inline: true },
      { name: 'Note', value: reason, inline: true }
    ]
  });

  await Database.putNote(user.id, reason, interaction.user.id);
  await interaction.editReply({
    embeds: [{
      ...SetSeverity('success'),
      title: 'Note Added',
      fields: [
        { name: 'User', value: `${user.tag}`, inline: false },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: false },
        { name: 'Reason', value: reason, inline: false },
      ],
    }],
  });
}

async function handleNoteEdit(context: Client<boolean>, interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const guild = await context.guilds.fetch(interaction.guildId);

  const input = getIdFromInput(interaction.options.getString('user', true));
  const user = await resolveUser(context, input, guild);
  if (!user) throw new Error('Unable to fetch a user with the given id.');

  const noteId = interaction.options.getInteger('note', true);

  const notes = await Database.getNotes(user.id);
  const note = notes.find(n => n.id == noteId);
  if (!note) throw new Error('The specified note ID could not be found.');

  const reason = interaction.options.getString('new-reason', true);

  await logCustomEvent(guild, {
    title: 'Note Edited',
    description: null,
    color: 0x00FF00,
    timestamp: new Date(),
    fields: [
      { name: 'Moderator', value: `<@${interaction.user.id}>\n${interaction.user.username}`, inline: true },
      { name: 'User', value: `<@${user.id}>\n${user.username}`, inline: true },
      { name: 'Old reason', value: note.reason },
      { name: 'New reason', value: reason, inline: true },
    ],
  });

  await Database.editNote(noteId, note.reason, reason, interaction.user.id);

  await interaction.editReply({
    embeds: [{
      ...SetSeverity('success'),
      title: 'Note Edited',
      fields: [
        { name: 'User', value: `${user.tag}`, inline: false },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: false },
        { name: 'Old Reason', value: note.reason, inline: false },
        { name: 'New Reason', value: reason, inline: false },
      ],
    }],
  });
}

async function handleNoteList(context: Client<boolean>, interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const guild = await context.guilds.fetch(interaction.guildId);

  const input = getIdFromInput(interaction.options.getString('user', true));
  const user = await resolveUser(context, input, guild);
  if (!user) throw new Error('Unable to fetch a user with the given id.');

  const noteMessage = await getNoteMessage(user.id, 1);
  if (!noteMessage) throw new Error(`No notes found for ${user.tag}`);

  await interaction.editReply(noteMessage);
}

async function handleNoteRemove(context: Client<boolean>, interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const guild = await context.guilds.fetch(interaction.guildId);

  const input = getIdFromInput(interaction.options.getString('user', true));
  const user = await resolveUser(context, input, guild);
  if (!user) throw new Error('Unable to fetch a user with the given id.');

  const noteId = interaction.options.getInteger('note', true);

  const notes = await Database.getNotes(user.id);
  const note = notes.find(n => n.id == noteId);
  if (!note) throw new Error('The specified note ID could not be found.');

  await logCustomEvent(guild, {
    title: 'Note Removed',
    description: null,
    color: 0xFF0000,
    timestamp: new Date(),
    fields: [
      { name: 'Moderator', value: `<@${interaction.user.id}>\n${interaction.user.username}`, inline: true },
      { name: 'User', value: `<@${user.id}>\n${user.username}`, inline: true },
      { name: 'Note', value: `${note.reason}\nBy: <@${note.mod_id}>`, inline: true }
    ],
  });

  await Database.removeNote(noteId);
  await interaction.editReply({
    embeds: [{
      ...SetSeverity('success'),
      title: 'Note Removed',
      description: 'The specified note has been successfully removed.',
    }],
  });
}

class NotesCommand implements Command<Client<boolean>> {
  data = new SlashCommandBuilder()
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
    );

  async handleCommand(context: Client<boolean>, interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inGuild()) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      switch (interaction.options.getSubcommand(true)) {
        case 'add': return await handleNoteAdd(context, interaction);
        case 'edit': return await handleNoteEdit(context, interaction);
        case 'list': return await handleNoteList(context, interaction);
        case 'remove': return await handleNoteRemove(context, interaction);
      }
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }

  async handleAutocomplete(context: Client<boolean>, interaction: AutocompleteInteraction): Promise<void> {
    const idToUse = getIdFromInput(interaction.options.getString('user', true));
    if (!idToUse) return interaction.respond([]);

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
}

export default new NotesCommand();
