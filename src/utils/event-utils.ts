import { EmbedAuthorOptions, APIEmbedField } from 'discord.js';
import { config } from '../config';
import { getE621Post, spoilerOrBlacklist, PostAction } from './e621-utils';
import { blipIDRegex, commentIDRegex, forumTopicIDRegex, poolIDRegex, postIDRegex, recordIDRegex, searchLinkRegex, setIDRegex, takedownIDRegex, ticketIDRegex, userIDRegex, wikiLinkRegex } from './message-matcher-regex';

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

const urlRegex = new RegExp('"((?:[\\S]| )+?)":\\[?((?:https?:\\/\\/[\\w\\d.\\/?=#&%]+)|\\/[\\w\\d.\\/?=#\\[\\]]+)\\]?', 'gi');

const MAX_DESCRIPTION_LENGTH = 500;

export async function getLinks(input: string, limit: number = Number.MAX_SAFE_INTEGER): Promise<string> {
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

export async function getDescription(data: { reason: string }): Promise<string> {
  return data.reason.length <= MAX_DESCRIPTION_LENGTH ? await getLinks(data.reason) : await getLinks(data.reason, MAX_DESCRIPTION_LENGTH);
}

export function getAuthor(data: { user_id: number, user: string }): EmbedAuthorOptions {
  return {
    url: `${config.E621_BASE_URL}/users/${data.user_id}`,
    name: data.user
  };
}

export function getColor(data: { claimant: string | null }): number {
  if (!data.claimant) {
    return 0xff0000;
  } else {
    return 0x00ffff;
  }
}

export function getFields(data: { category: string, status: string, claimant: string | null }): APIEmbedField[] {
  return [
    {
      name: 'Type',
      value: data.category,
      inline: true
    },
    {
      name: 'Status',
      value: data.status,
      inline: true
    },
    {
      name: 'Claimed By',
      value: !data.claimant ? '<Unclaimed>' : data.claimant,
      inline: true
    }
  ];
}