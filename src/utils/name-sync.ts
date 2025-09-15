import { ChatInputCommandInteraction, GuildMember, ModalSubmitInteraction, UserContextMenuCommandInteraction } from 'discord.js';
import { Database } from '../shared/Database';
import { E621User } from '../types';
import { getE621User } from './e621-utils';

export async function syncName(interaction: ChatInputCommandInteraction | UserContextMenuCommandInteraction | ModalSubmitInteraction, member: GuildMember, id: number | null) {
  if (member.roles.highest.comparePositionTo(member.guild.members.me!.roles.highest) > 0) {
    const res = interaction.user.id == member.id ? 'your' : 'their';
    return interaction.editReply(`I am unable to set ${res} nickname as ${res} role is higher than mine.`);
  }

  const availableIds = await Database.getE621Ids(interaction.user.id);

  let e621User: E621User | null;

  if (!id || !availableIds.includes(id)) {
    e621User = await getE621User(availableIds[0]);
  } else {
    e621User = await getE621User(id);
  }

  if (!e621User) {
    return interaction.editReply("Couldn't figure out what your name was. Please contact an administrator.");
  }

  await member.setNickname(e621User.name);
  interaction.editReply(`Nickname set to: ${e621User.name}`);
}