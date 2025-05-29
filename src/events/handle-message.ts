import { AllowedMentionsTypes, Message as DiscordMessage, GuildTextBasedChannel, OmitPartialGroupDMChannel, PartialMessage, ReadonlyCollection } from 'discord.js';
import { config } from '../config';
import { E621Post } from '../types';
import { getE621Post, getE621PostByMd5, getPostUrl, hasBlacklistedTags } from '../utils/e621-utils';
import { Database } from '../shared/Database';
import { logDeletion, logEdit } from '../utils/message-logger';
import { isEdited } from '../utils/message-utils';
import { channelIsInStaffCategory } from '../utils';

export type Message<InGuild extends boolean = boolean> = OmitPartialGroupDMChannel<DiscordMessage<InGuild>>;
export type Partial = OmitPartialGroupDMChannel<PartialMessage>;

// TODO: I don't know of any good way to not hardcode this regex for e621 links. So I've provided two that may need to have the port altered.
const postRegex = new RegExp('!?https?://(?:.*@)?(?:e621|e926)\\.net/+posts/+([0-9]+)', 'gi');
const imageRegex = new RegExp('!?https?://(?:.*@)?static[0-9]*\\.(?:e621|e926)\\.net/+data/+(?:sample/+|preview/+|)[\\da-f]{2}/+[\\da-f]{2}/+([\\da-f]{32})\\.[\\da-z]+', 'gi');

const postRegex_DEV = new RegExp('!?https?://(?:.*@)?localhost:3000/+posts/+([0-9]+)', 'gi');
const imageRegex_DEV = new RegExp('!?https?://(?:.*@)?localhost:3000/+data/+(?:sample/+|preview/+|)[\\da-f]{2}/+[\\da-f]{2}/+([\\da-f]{32})\\.[\\da-z]+', 'gi');

const postIDRegex = new RegExp('post #([0-9]+)', 'gi');
const tagSearchRegex = '(?:[\\S]| )+?';
const wikiLinkRegex = new RegExp(`\\[\\[(${tagSearchRegex})]]`, 'gi');
const searchLinkRegex = new RegExp(`{{(${tagSearchRegex})}}`, 'gi');

const regexTesters = [
  { runInDev: false, regex: postRegex, handler: postHandler },
  { runInDev: false, regex: imageRegex, handler: imageHandler },
  { runInDev: true, regex: postRegex_DEV, handler: postHandler },
  { runInDev: true, regex: imageRegex_DEV, handler: imageHandler },
  { runInDev: true, regex: postIDRegex, handler: postIdHandler },
  { runInDev: true, regex: wikiLinkRegex, handler: wikiPageHandler },
  { runInDev: true, regex: searchLinkRegex, handler: searchHandler }
];

const uniqueRegexMatches = (g, i, a) => a.findIndex(v => v[1] == g[1]) == i;

export async function handleMessageCreate(message: Message) {
  if (message.author.bot) return;
  if (message.inGuild()) await Database.putMessage(message);

  for (const test of regexTesters) {
    if (config.DEV_MODE && !test.runInDev) continue;

    const hasMatches = test.regex.test(message.content);
    test.regex.lastIndex = 0;

    if (hasMatches) {
      const matches: RegExpExecArray[] = [];
      let match: RegExpExecArray | null;

      while ((match = test.regex.exec(message.content)) != null) {
        matches.push(match);
      }
      test.regex.lastIndex = 0;

      if (!await test.handler(message, matches.filter(uniqueRegexMatches))) return;
    }
  }
}

export async function handleMessageUpdate(oldMessage: Message | PartialMessage, newMessage: Message) {
  if (newMessage.author.bot) return;

  const loggedMessage = await Database.getMessageWithRetry(newMessage.id);

  if (!loggedMessage) return;

  if (newMessage.inGuild() && isEdited(loggedMessage, newMessage)) {
    await Database.putMessage(newMessage);
    await logEdit(loggedMessage, newMessage);
  }

  if (loggedMessage.content == newMessage.content) return;

  for (const test of regexTesters) {
    if (config.DEV_MODE && !test.runInDev) continue;

    const hasMatches = test.regex.test(newMessage.content);
    test.regex.lastIndex = 0;

    if (hasMatches) {
      const oldMatches: RegExpExecArray[] = [];
      const newMatches: RegExpExecArray[] = [];
      let match: RegExpExecArray | null;

      while ((match = test.regex.exec(newMessage.content)) != null) {
        newMatches.push(match);
      }
      test.regex.lastIndex = 0;

      while ((match = test.regex.exec(loggedMessage.content)) != null) {
        oldMatches.push(match);
      }
      test.regex.lastIndex = 0;

      const properMatches: RegExpExecArray[] = [];

      for (const newMatch of newMatches) {
        if (!oldMatches.find(m => m[1] == newMatch[1])) properMatches.push(newMatch);
      }

      if (properMatches.length > 0 && !await test.handler(newMessage, properMatches.filter(uniqueRegexMatches))) return;
    }
  }
}

export async function handleMessageDelete(message: Message | PartialMessage) {
  const loggedMessage = await Database.getMessageWithRetry(message.id);

  if (!loggedMessage) return;

  if (message.inGuild()) await logDeletion(loggedMessage, message);
}

export async function handleBulkMessageDelete(messages: ReadonlyCollection<string, Message | Partial>, channel: GuildTextBasedChannel) {
  for (const message of messages.values()) {
    await handleMessageDelete(message);
  }
}

async function searchHandler(message: Message, matchedGroups: RegExpExecArray[]): Promise<boolean> {
  let content = '';

  for (const group of matchedGroups) {
    content += `<${config.E621_BASE_URL}/posts?tags=${encodeURIComponent(group[1])}>\n`;
  }

  await message.reply(content.trim());

  return true;
}

async function wikiPageHandler(message: Message, matchedGroups: RegExpExecArray[]): Promise<boolean> {
  let content = '';

  for (const group of matchedGroups) {
    content += `<${config.E621_BASE_URL}/wiki_pages/${encodeURIComponent(group[1])}>\n`;
  }

  await message.reply(content.trim());

  return true;
}

async function blacklistIfNecessary(message: Message, posts: E621Post[]): Promise<boolean> {
  const blacklistedIds: number[] = [];

  const channel = await message.channel.fetch() as GuildTextBasedChannel;

  const isStaffChannel = await channelIsInStaffCategory(channel);

  for (const post of posts) {
    if (hasBlacklistedTags(post)) {
      blacklistedIds.push(post.id);
    }
  }

  if (blacklistedIds.length == 0) return false;

  await message.delete();

  if (channel.parentId && isStaffChannel) {
    await message.channel.send({
      content: `_sucks message into the void._ ${message.author.toString()} nono, don't post links to ${blacklistedIds.length == 1 ? `post ${blacklistedIds[0]}` : `posts \`${blacklistedIds.join('`, `')}\``}. See rule #5.b for more details.`,
      allowedMentions: {
        users: [message.author.id]
      }
    });
  } else {
    await message.channel.send({
      content: `_sucks message into the void._ ${message.author.toString()} nono, don't post links to young/cub content. See rule #5.b for more details.`,
      allowedMentions: {
        users: [message.author.id]
      }
    });
  }

  return true;
}

async function postIdHandler(message: Message, matchedGroups: RegExpExecArray[]): Promise<boolean> {
  if (!message.guildId) return true;

  const posts: E621Post[] = [];

  for (const match of matchedGroups) {
    try {
      const post = await getE621Post(match[1]);
      if (post) posts.push(post);
    } catch (e) {
      console.error(e);
    }
  }

  if (await blacklistIfNecessary(message, posts)) return false;

  const content = posts.map(post => getPostUrl(post)).join('\n');

  if (content.length > 0) await message.reply(content);

  return true;
}

async function postHandler(message: Message, matchedGroups: RegExpExecArray[]): Promise<boolean> {
  if (!message.guildId) return true;

  const posts: E621Post[] = [];

  for (const match of matchedGroups) {
    try {
      const post = await getE621Post(match[1]);
      if (post) posts.push(post);
    } catch (e) {
      console.error(e);
    }
  }

  if (await blacklistIfNecessary(message, posts)) return false;

  return true;
}

async function imageHandler(message: Message, matchedGroups: RegExpExecArray[]): Promise<boolean> {
  if (!message.guildId) return true;

  const posts: E621Post[] = [];

  for (const match of matchedGroups) {
    try {
      const post = await getE621PostByMd5(match[1]);
      if (post) posts.push(post);
    } catch (e) {
      console.error(e);
    }
  }

  if (await blacklistIfNecessary(message, posts)) return false;

  const content = posts.map(post => getPostUrl(post)).join('\n');

  if (content.length > 0) await message.reply(content);

  return true;
}