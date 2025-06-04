import { createClient } from '@redis/client';
import { Database } from './Database';
import { config } from '../config';
import { APIEmbedField, Client, EmbedAuthorOptions, EmbedBuilder, SendableChannels, TextBasedChannel } from 'discord.js';
import { blipIDRegex, commentIDRegex, forumTopicIDRegex, humanizeCapitalization, poolIDRegex, postIDRegex, shouldAlert, recordIDRegex, searchLinkRegex, setIDRegex, takedownIDRegex, ticketIDRegex, userIDRegex, wikiLinkRegex, getE621Post, hasBlacklistedTags } from '../utils';
import { BanUpdate, Ticket, TicketPhrase, TicketUpdate } from '../types';

// TODO: Condense this and the message event handler regex array.
const linkReplacers = [
  {
    regex: blipIDRegex,
    replacement: '/blips/{match}',
    encodeURI: false
  },
  {
    regex: commentIDRegex,
    replacement: '/comments/{match}',
    encodeURI: false
  },
  {
    regex: forumTopicIDRegex,
    replacement: '/forum_topics/{match}',
    encodeURI: false
  },
  {
    regex: poolIDRegex,
    replacement: '/pools/{match}',
    encodeURI: false
  },
  {
    regex: postIDRegex,
    tester: async (postId: string, before: string, after: string) => {
      const post = await getE621Post(postId);
      if (!post) return { allowed: true, before, after };
      const allowed = !hasBlacklistedTags(post);

      return { allowed, before, after };
    },
    replacement: '/posts/{match}',
    encodeURI: false
  },
  {
    regex: recordIDRegex,
    replacement: '/user_feedbacks/{match}',
    encodeURI: false
  },
  {
    regex: searchLinkRegex,
    replacement: '/posts?tags={match}',
    encodeURI: true
  },
  {
    regex: setIDRegex,
    replacement: '/post_sets/{match}',
    encodeURI: false
  },
  {
    regex: takedownIDRegex,
    replacement: '/takedowns/{match}',
    encodeURI: false
  },
  {
    regex: ticketIDRegex,
    replacement: '/tickets/{match}',
    encodeURI: false
  },
  {
    regex: userIDRegex,
    replacement: '/users/{match}',
    encodeURI: false
  },
  {
    regex: wikiLinkRegex,
    replacement: '/wiki_pages/{match}',
    encodeURI: true
  }
];

const MAX_DESCRIPTION_LENGTH = 500;

let discordClient: Client;

export async function openRedisClient(url: string, discClient: Client) {
  const client = await createClient({
    url: `redis://${url}`,
    socket: {
      reconnectStrategy: 60000
    }
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

async function getLinks(input: string, limit: number = Number.MAX_SAFE_INTEGER): Promise<string> {
  const length = input.length;

  const replacedIndexes: { start: number, end: number }[] = [];
  const checks: Promise<{ allowed: boolean, before: string, after: string }>[] = [];

  for (const replacer of linkReplacers) {
    input = input.replaceAll(replacer.regex, (match, group1) => {
      const replaced = `[${match}](${config.E621_BASE_URL}${(replacer.replacement).replace('{match}', replacer.encodeURI ? encodeURIComponent(group1) : group1)})`;
      if (replacer.tester) checks.push(replacer.tester(group1, match, replaced));
      const start = input.indexOf(match);
      replacedIndexes.push({ start, end: start + replaced.length });

      return replaced;
    });
  }

  const values = await Promise.all(checks);

  for (const check of values) {
    if (!check.allowed) {
      input = input.replace(check.after, check.before);
    }
  }

  if (length > limit) {
    for (const replacedIndex of replacedIndexes) {
      if (replacedIndex.start < limit && replacedIndex.end >= limit) {
        return input.substring(0, replacedIndex.end) + '...';
      }
    }

    return input.substring(0, limit) + '...';
  }

  return input;
}

async function getDescription(ticket: Ticket): Promise<string> {
  return ticket.reason.length <= MAX_DESCRIPTION_LENGTH ? await getLinks(ticket.reason) : await getLinks(ticket.reason, MAX_DESCRIPTION_LENGTH);
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

async function createEmbedFromTicket(ticket: Ticket): Promise<EmbedBuilder> {
  return new EmbedBuilder()
    .setTitle(getTitle(ticket))
    .setURL(getURL(ticket))
    .setDescription(await getDescription(ticket))
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

  const embed = await createEmbedFromTicket(ticket);

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

  if (!messageId) return postTicket(data);

  const message = await channel.messages.fetch(messageId);
  const embed = await createEmbedFromTicket(data.ticket);

  if (!message || message.author.id != config.DISCORD_CLIENT_ID) {
    const newMessage = await channel.send({ embeds: [embed] });
    await Database.removeTicket(data.ticket.id);
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