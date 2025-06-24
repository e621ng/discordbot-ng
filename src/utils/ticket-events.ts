import { Client, EmbedAuthorOptions, APIEmbedField, EmbedBuilder, SendableChannels } from 'discord.js';
import { config } from '../config';
import { Database } from '../shared/Database';
import { TicketUpdate, Ticket, TicketPhrase } from '../types';
import { humanizeCapitalization } from './string-utils';
import { shouldAlert } from './ticket-utils';
import { blipIDRegex, commentIDRegex, forumTopicIDRegex, poolIDRegex, postIDRegex, recordIDRegex, searchLinkRegex, setIDRegex, takedownIDRegex, ticketIDRegex, userIDRegex, wikiLinkRegex } from './search-regex';
import { getE621Post, spoilerOrBlacklist, PostAction } from './e621-utils';

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
      const allowed = spoilerOrBlacklist(post).action != PostAction.Blacklist;

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

const urlRegex = new RegExp('"((?:[\\S]| )+?)":\\[?((?:https?:\\/\\/[\\w\\d.\\/?=#&%]+)|\\/[\\w\\d.\\/?=#]+)\\]?', 'gi');

const MAX_DESCRIPTION_LENGTH = 500;

export async function ticketUpdateHandler(client: Client, update: string) {
  const data: TicketUpdate = JSON.parse(update);

  if (data.action == 'create') {
    postTicket(client, data);
  } else {
    updateTicket(client, data);
  }
}

async function postTicket(client: Client, data: TicketUpdate) {
  const guildSettings = await Database.getGuildSettings(config.DISCORD_GUILD_ID!);

  if (!guildSettings || !guildSettings.tickets_channel_id) return;

  const channel = await client.channels.fetch(guildSettings.tickets_channel_id);

  if (!channel || !channel.isSendable()) return;

  const ticket = data.ticket;

  const embed = await createEmbedFromTicket(ticket);

  const message = await channel.send({ embeds: [embed] });

  await Database.putTicket(ticket.id, message.id);

  sendTicketAlerts(ticket, channel);
}

async function updateTicket(client: Client, data: TicketUpdate) {
  const guildSettings = await Database.getGuildSettings(config.DISCORD_GUILD_ID!);

  if (!guildSettings || !guildSettings.tickets_channel_id) return;

  const channel = await client.channels.fetch(guildSettings.tickets_channel_id);

  if (!channel || !channel.isSendable()) return;

  const messageId = await Database.getTicketMessageId(data.ticket.id);

  if (!messageId) return postTicket(client, data);

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

  input = input.replaceAll(urlRegex, (match, group1, group2) => {
    const replaced = group2.startsWith('/') ? `[${group1}](${config.E621_BASE_URL}${group2})` : `[${group1}](${group2})`;
    const start = input.indexOf(match);
    replacedIndexes.push({ start, end: start + replaced.length });
    return replaced;
  });

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