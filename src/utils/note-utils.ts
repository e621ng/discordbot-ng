import { ActionRowBuilder, APIEmbedField, ButtonBuilder, ButtonStyle, EmbedBuilder, GuildMember, MessageActionRowComponentBuilder, time } from 'discord.js';
import { Database } from '../shared/Database';
import { MessageContent, Note } from '../types';

const NOTES_PER_PAGE = 5;

function getNoteText(note: Note): string {
  const timestamp = time(new Date(note.timestamp));

  return `### Note by <@${note.mod_id}> (${timestamp}):\n${note.reason}`;
}

export async function getNoteMessage(userId: string, page: number): Promise<MessageContent | null> {
  const notes = (await Database.getNotes(userId)).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  page = page - 1;

  const maxPage = Math.floor(notes.length / NOTES_PER_PAGE);

  if (notes.length == 0) return null;

  const noteTexts: string[] = [];

  for (let i = page * NOTES_PER_PAGE; i < page * NOTES_PER_PAGE + NOTES_PER_PAGE; i++) {
    if (i >= notes.length) break;

    noteTexts.push(getNoteText(notes[i]));
  }

  const prevPage = new ButtonBuilder()
    .setLabel('Previous Page')
    .setCustomId(`note-previous_${userId}_${page + 1}`)
    .setDisabled(page == 0)
    .setStyle(ButtonStyle.Primary);

  const nextPage = new ButtonBuilder()
    .setLabel('Next Page')
    .setCustomId(`note-next_${userId}_${page + 1}`)
    .setDisabled(page >= maxPage)
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(prevPage, nextPage);

  return {
    content: `<@${userId}>'s Notes\n` + noteTexts.join('\n\n') + `\n\n-# Page ${page + 1}/${maxPage + 1}`,
    components: [row]
  };
}