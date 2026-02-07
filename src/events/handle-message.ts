import { Message as DiscordMessage, GuildBasedChannel, GuildTextBasedChannel, OmitPartialGroupDMChannel, PartialMessage, ReadonlyCollection, spoiler } from 'discord.js';
import { config } from '../config';
import { Database } from '../shared/Database';
import { E621Post } from '../types';
import { ALLOWED_MIMETYPES, artistIDRegex, blipIDRegex, calculateMD5FromURL, channelIgnoresLinks, channelIsInStaffCategory, channelIsSafe, commentIDRegex, forumTopicIDRegex, getE621Post, getE621PostByMd5, getPostUrl, isEdited, isInSpoilerTags, logDeletion, logEdit, poolIDRegex, PostAction, postIDRegex, recordIDRegex, searchLinkRegex, setIDRegex, spoilerOrBlacklist, takedownIDRegex, ticketIDRegex, userIDRegex, wikiLinkRegex } from '../utils';

export type Message<InGuild extends boolean = boolean> = OmitPartialGroupDMChannel<DiscordMessage<InGuild>>;
export type Partial = OmitPartialGroupDMChannel<PartialMessage>;

// TODO: I don't know of any good way to not hardcode this regex for e621 links. So I've provided two that may need to have the port altered.
const postRegex = new RegExp('!?https?://(?:.*@)?(?:e621|e926)\\.net/+posts/+([0-9]+)', 'gi');
const postShareRegex = new RegExp('!?https?://(?:.*@)?(?:e621|e926)\\.net/+p/+([a-z0-9]+)', 'gi');
const imageRegex = new RegExp('!?https?://(?:.*@)?static[0-9]*\\.(?:e621|e926)\\.net/+data/+(?:sample/+|preview/+|)[\\da-f]{2}/+[\\da-f]{2}/+([\\da-f]{32})\\.[\\da-z]+', 'gi');

const postRegex_DEV = new RegExp('!?https?://(?:.*@)?localhost:3000/+posts/+([0-9]+)', 'gi');
const imageRegex_DEV = new RegExp('!?https?://(?:.*@)?localhost:3000/+data/+(?:sample/+|preview/+|)[\\da-f]{2}/+[\\da-f]{2}/+([\\da-f]{32})\\.[\\da-z]+', 'gi');

const md5Regex = new RegExp('^([a-f0-9]{32}).(?:png|apng|jpg|jpeg|gif|webm|mp4)$', 'gi');

const regexTesters = [
  { runInDev: false, regex: postRegex, handler: postHandler.bind(null, null) },
  {
    runInDev: false, regex: postShareRegex, handler: postHandler.bind(null, (idString: string) => {
      return parseInt(idString, 32);
    })
  },
  { runInDev: false, regex: imageRegex, handler: imageHandler },
  { runInDev: true, regex: postRegex_DEV, handler: postHandler.bind(null, null) },
  { runInDev: true, regex: imageRegex_DEV, handler: imageHandler },
  { runInDev: true, regex: postIDRegex, handler: postIdHandler },
  { runInDev: true, regex: userIDRegex, handler: idHandler.bind(null, 'users') },
  { runInDev: true, regex: forumTopicIDRegex, handler: idHandler.bind(null, 'forum_topics') },
  { runInDev: true, regex: commentIDRegex, handler: idHandler.bind(null, 'comments') },
  { runInDev: true, regex: blipIDRegex, handler: idHandler.bind(null, 'blips') },
  { runInDev: true, regex: poolIDRegex, handler: idHandler.bind(null, 'pools') },
  { runInDev: true, regex: setIDRegex, handler: idHandler.bind(null, 'post_sets') },
  { runInDev: true, regex: takedownIDRegex, handler: idHandler.bind(null, 'takedowns') },
  { runInDev: true, regex: recordIDRegex, handler: idHandler.bind(null, 'user_feedbacks') },
  { runInDev: true, regex: ticketIDRegex, handler: idHandler.bind(null, 'tickets') },
  { runInDev: true, regex: artistIDRegex, handler: idHandler.bind(null, 'artists') },
  { runInDev: true, regex: wikiLinkRegex, handler: wikiPageHandler },
  { runInDev: true, regex: searchLinkRegex, handler: searchHandler }
];

const uniqueRegexMatches = (g, i, a) => a.findIndex(v => v[1] == g[1]) == i;

export async function handleMessageCreate(message: Message) {
  if (message.author.bot) return;
  if (message.inGuild()) await Database.putMessage(message);

  const responses: string[] = [];

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

      const response = await test.handler(message, matches.filter(uniqueRegexMatches));

      if (response === false) return;

      if (response !== true) responses.push(response as string);
    }
  }

  for (const attachment of message.attachments.values()) {
    const match = md5Regex.exec(attachment.name);
    md5Regex.lastIndex = 0;

    const md5s: string[] = [];

    if (match) md5s.push(match[1]);
    else if (ALLOWED_MIMETYPES.includes(attachment.contentType!)) {
      const md5Data = await calculateMD5FromURL(attachment.url);
      if (!md5Data) continue;
      md5s.push(md5Data.correctedFileMD5, md5Data.originalFileMD5);
    }

    if (md5s.length == 0) continue;

    for (const md5 of md5s) {
      const post = await getE621PostByMd5(md5);

      if (post) {
        if (await blacklistIfNecessary(message, [post])) return;

        responses.push(`<${getPostUrl(post)}>`);

        continue;
      }
    }
  }

  if (responses.length > 0) {
    await message.reply(responses.join('\n'));
  }
}

export async function handleMessageUpdate(oldMessage: Message | PartialMessage, newMessage: Message) {
  if (newMessage.author.bot) return;

  const loggedMessage = await Database.getMessageWithRetry(newMessage.id);

  if (!loggedMessage) {
    if (newMessage.inGuild()) await Database.putMessage(newMessage);

    return;
  }

  if (newMessage.inGuild() && isEdited(loggedMessage, newMessage)) {
    await Database.putMessage(newMessage);
    await logEdit(loggedMessage, newMessage);
  }

  if (loggedMessage.content == newMessage.content) return;

  const responses: string[] = [];

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

      if (properMatches.length == 0) continue;

      const response = await test.handler(newMessage, properMatches.filter(uniqueRegexMatches));

      if (response === false) return;

      if (response !== true) responses.push(response as string);
    }
  }

  if (responses.length > 0) {
    await newMessage.reply(responses.join('\n'));
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

async function searchHandler(message: Message, matchedGroups: RegExpExecArray[]): Promise<string | boolean> {
  const skip = await channelIgnoresLinks(message.channel as GuildBasedChannel);

  if (skip) return true;

  let content = '';

  for (const group of matchedGroups) {
    content += `<${config.E621_BASE_URL}/posts?tags=${encodeURIComponent(group[1])}>\n`;
  }

  if (content.trim().length > 0) return content.trim();

  return true;
}

async function wikiPageHandler(message: Message, matchedGroups: RegExpExecArray[]): Promise<string | boolean> {
  const skip = await channelIgnoresLinks(message.channel as GuildBasedChannel);

  if (skip) return true;

  let content = '';

  for (const group of matchedGroups) {
    content += `<${config.E621_BASE_URL}/wiki_pages/${group[1].split('#').map(t => encodeURIComponent(t)).join('#')}>\n`;
  }

  if (content.trim().length > 0) return content.trim();

  return true;
}

async function blacklistIfNecessary(message: Message, posts: E621Post[]): Promise<boolean> {
  const blacklistedIds: number[] = [];

  const channel = await message.channel.fetch() as GuildTextBasedChannel;

  const isStaffChannel = await channelIsInStaffCategory(channel);

  for (const post of posts) {
    if (spoilerOrBlacklist(post).action == PostAction.Blacklist) {
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

async function postIdHandler(message: Message, matchedGroups: RegExpExecArray[]): Promise<string | boolean> {
  if (!message.guildId) return true;

  const posts: { post: E621Post, spoilered: boolean }[] = [];

  for (const match of matchedGroups) {
    try {
      const post = await getE621Post(match[1]);
      if (post) posts.push({
        spoilered: isInSpoilerTags(message.content, match.index),
        post
      });
    } catch (e) {
      console.error(e);
    }
  }

  if (await blacklistIfNecessary(message, posts.map(p => p.post))) return false;

  const skip = await channelIgnoresLinks(message.channel as GuildBasedChannel);

  if (skip) return true;

  const sfw = await channelIsSafe(message.channel as GuildBasedChannel);

  const content = posts.map((postData) => {
    if (sfw && postData.post.rating != 's') return ` [NSFW] <${getPostUrl(postData.post)}>`;

    const shouldSpoiler = spoilerOrBlacklist(postData.post);
    if (shouldSpoiler.action == PostAction.Spoiler) return `${spoiler(getPostUrl(postData.post))} (${shouldSpoiler.tag})`;

    return postData.spoilered ? spoiler(getPostUrl(postData.post)) : getPostUrl(postData.post);
  }).join('\n');

  if (content.trim().length > 0) return content.trim();

  return true;
}

async function idHandler(path: string, message: Message, matchedGroups: RegExpExecArray[]): Promise<string | boolean> {
  if (!message.guildId) return true;

  const skip = await channelIgnoresLinks(message.channel as GuildBasedChannel);

  if (skip) return true;

  const content = matchedGroups.map(m => `${config.E621_BASE_URL}/${path}/${m[1]}`).join('\n');

  if (content.trim().length > 0) return content.trim();

  return true;
}

async function postHandler(transform: ((idString: string) => number) | null, message: Message, matchedGroups: RegExpExecArray[]): Promise<string | boolean> {
  if (!message.guildId) return true;

  const posts: E621Post[] = [];

  for (const match of matchedGroups) {
    try {
      const post = await getE621Post(transform ? transform(match[1]) : match[1]);
      if (post) posts.push(post);
    } catch (e) {
      console.error(e);
    }
  }

  if (await blacklistIfNecessary(message, posts)) return false;

  return true;
}

async function imageHandler(message: Message, matchedGroups: RegExpExecArray[]): Promise<string | boolean> {
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

  const skip = await channelIgnoresLinks(message.channel as GuildBasedChannel);

  if (skip) return true;

  const content = posts.map(post => `<${getPostUrl(post)}>`).join('\n');

  if (content.trim().length > 0) return content.trim();

  return true;
}