import { Message } from '../events';

export const ARRAY_SEPARATOR = '$';

const spoilerRegex = new RegExp('\\|\\|((?:[\\S]| )+?)\\|\\|', 'gi');

export function serializeMessage(message: Message): string[] {
  const attachments = message.attachments.map(a => `${a.name}:${a.id}`);
  const stickers = message.stickers.map(s => `${s.name}:${s.id}`);

  return [message.id, message.author.id, message.author.username, message.channelId, attachments.join(ARRAY_SEPARATOR), stickers.join(ARRAY_SEPARATOR), message.content];
}

export function deserializeMessagePart(part: string): string[] {
  return part.split(ARRAY_SEPARATOR).filter(e => e);
}

export function isInSpoilerTags(content: string, index: number): boolean {
  if (!content.includes('||')) return false;

  let match: RegExpExecArray | null;
  while ((match = spoilerRegex.exec(content)) != null) {
    if (index >= match.index && index <= spoilerRegex.lastIndex) {
      spoilerRegex.lastIndex = 0;
      return true;
    }
  }

  spoilerRegex.lastIndex = 0;
  return false;
}