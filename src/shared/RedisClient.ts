import { createClient } from '@redis/client';
import { Database } from './Database';
import { config } from '../config';
import { APIEmbedField, Client, EmbedAuthorOptions, EmbedBuilder, SendableChannels, TextBasedChannel } from 'discord.js';
import { humanizeCapitalization } from '../utils/string-utils';
import { BanUpdate, Ticket, TicketPhrase, TicketUpdate } from '../types';
import { shouldAlert } from '../utils/ticket-utils';

const MAX_DESCRIPTION_LENGTH = 500;

let discordClient: Client;

export async function openRedisClient(url: string, discClient: Client) {
  const client = await createClient({
    url: `redis://${url}`
  });

  await client.connect();

  discordClient = discClient;

  console.log('Connected to redis database');

  await client.subscribe(['ticket_updates', 'ban_updates'], updateHandler);
}

function updateHandler(data: string, channel: string) {
  switch (channel) {
    case 'ticket_updates':
      return ticketUpdateHandler(data);
    case 'ban_updates':
      return banUpdateHandler(data);
  }
}

async function banUpdateHandler(update: string) {
  const data: BanUpdate = JSON.parse(update);

  if (data.action == 'create') {
    kickDiscordAccounts(data);
  }
  // else if (data.action == 'delete') {
  //   // unbanDiscordAccounts(data);
  // }
}

async function kickDiscordAccounts(data: BanUpdate) {
  const guild = await discordClient.guilds.fetch(config.DISCORD_GUILD_ID!);

  const discordIds = await Database.getDiscordIds(data.ban.user_id);

  for (const id of discordIds) {
    const member = await guild.members.fetch(id);

    if (member) await member.kick(data.ban.reason);
  }
}

// async function banDiscordAccounts(data: BanUpdate) {
//   const guild = await discordClient.guilds.fetch(config.DISCORD_GUILD_ID!);

//   const discordIds = await Database.getDiscordIds(data.ban.user_id);

//   for (const id of discordIds) {
//     await guild.bans.create(id, {
//       reason: data.ban.reason
//     });
//   }
// }

// async function unbanDiscordAccounts(data: BanUpdate) {
//   const guild = await discordClient.guilds.fetch(config.DISCORD_GUILD_ID!);

//   const discordIds = await Database.getDiscordIds(data.ban.user_id);

//   for (const id of discordIds) {
//     await guild.bans.remove(id);
//   }
// }

async function ticketUpdateHandler(update: string) {
  const data: TicketUpdate = JSON.parse(update);

  if (data.action == 'create') {
    postTicket(data);
  } else {
    updateTicket(data);
  }
}

function getTitle(ticket: Ticket): string {
  if (!ticket.target) return `${humanizeCapitalization(ticket.category)} report by ${ticket.user}`;

  switch (ticket.category) {
    case 'blip':
      return `Blip by ${ticket.target}`;
    case 'comment':
      return `Comment by ${ticket.target}`;
    case 'dmail':
      return `DMail sent by ${ticket.target}`;
    case 'forum':
      return `Forum post by ${ticket.target}`;
    case 'pool':
      return `Pool ${ticket.target}`;
    case 'post':
      return `Post uploaded by ${ticket.target}`;
    case 'set':
      return `Wow, a rare set report! ${ticket.target}`;
    case 'user':
      return `User ${ticket.target}`;
    case 'wiki':
      return `Wiki page ${ticket.target}`;
    default:
      return 'Uknown ticket category';
  }
}

function getURL(ticket: Ticket): string {
  return `${config.E621_BASE_URL}/tickets/${ticket.id}`;
}

function getDescription(ticket: Ticket): string {
  return ticket.reason.length <= MAX_DESCRIPTION_LENGTH ? ticket.reason : ticket.reason.substring(0, MAX_DESCRIPTION_LENGTH);
}

function getAuthor(ticket: Ticket): EmbedAuthorOptions {
  return {
    url: `${config.E621_BASE_URL}/users/${ticket.user_id}`,
    name: ticket.user
  };
}

function getColor(ticket: Ticket): number {
  if (!ticket.claimant) {
    return 0xff0000;
  } else {
    return 0x00ffff;
  }
}

function getFields(ticket: Ticket): APIEmbedField[] {
  return [
    {
      name: 'Type',
      value: ticket.category,
      inline: true
    },
    {
      name: 'Status',
      value: ticket.status,
      inline: true
    },
    {
      name: 'Claimed By',
      value: !ticket.claimant ? '<Unclaimed>' : ticket.claimant,
      inline: true
    }
  ];
}

function createEmbedFromTicket(ticket: Ticket): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(getTitle(ticket))
    .setURL(getURL(ticket))
    .setDescription(getDescription(ticket))
    .setAuthor(getAuthor(ticket))
    .setColor(getColor(ticket))
    .setFields(...getFields(ticket));
}

async function postTicket(data: TicketUpdate) {
  const guildSettings = await Database.getGuildSettings(config.DISCORD_GUILD_ID!);

  if (!guildSettings || !guildSettings.tickets_channel_id) return;

  const channel = await discordClient.channels.fetch(guildSettings.tickets_channel_id);

  if (!channel || !channel.isSendable()) return;

  const ticket = data.ticket;

  const embed = createEmbedFromTicket(ticket);

  const message = await channel.send({ embeds: [embed] });

  await Database.putTicket(ticket.id, message.id);

  sendTicketAlerts(ticket, channel);
}

async function updateTicket(data: TicketUpdate) {
  const guildSettings = await Database.getGuildSettings(config.DISCORD_GUILD_ID!);

  if (!guildSettings || !guildSettings.tickets_channel_id) return;

  const channel = await discordClient.channels.fetch(guildSettings.tickets_channel_id);

  if (!channel || !channel.isSendable()) return;

  const messageId = await Database.getTicketMessageId(data.ticket.id);

  if (!messageId) return;

  const message = await channel.messages.fetch(messageId);
  const embed = createEmbedFromTicket(data.ticket);

  if (!message) {
    const newMessage = await channel.send({ embeds: [embed] });
    await Database.putTicket(data.ticket.id, newMessage.id);
  } else {
    await message.edit({ embeds: [embed] });
  }
}

async function sendTicketAlerts(ticket: Ticket, channel: SendableChannels) {
  const guildSettings = await Database.getGuildSettings(config.DISCORD_GUILD_ID!);

  if (!guildSettings || !guildSettings.admin_role_id) return;

  const usersToMention: string[] = [];
  const rolesToMention: string[] = [];
  let content = '';

  await Database.getAllTicketPhrases((ticketPhrase: TicketPhrase) => {
    const { alert, match } = shouldAlert(ticketPhrase, ticket);
    if (alert) {
      const mention = ticketPhrase.user_id == 'admin' ? `<@&${guildSettings.admin_role_id!}>` : `<@${ticketPhrase.user_id}>`;

      if (ticketPhrase.user_id == 'admin' && !rolesToMention.includes(guildSettings.admin_role_id!)) {
        rolesToMention.push(guildSettings.admin_role_id!);
      } else if (!usersToMention.includes(ticketPhrase.user_id)) {
        usersToMention.push(ticketPhrase.user_id);
      }

      content += `${mention}: ${match}\n`;
    }
  });

  if (content.length == 0) return;

  await channel.send({
    content,
    allowedMentions: {
      users: usersToMention,
      roles: rolesToMention
    }
  });
}