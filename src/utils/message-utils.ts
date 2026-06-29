import { Message } from '../events';
import { Encrypter } from '../shared/Encrypter';
import { LoggedMessage } from '../types';

export const ARRAY_SEPARATOR = '$';

const spoilerRegex = new RegExp('\\|\\|((?:[\\S]| )+?)\\|\\|', 'gi');

export function serializeMessage(message: Message): string[] {
  const attachments = message.attachments.map(a => `${a.name}:${a.id}`);
  const stickers = message.stickers.map(s => `${s.name}:${s.id}`);

  return [Encrypter.encrypt(message.id), Encrypter.hash(message.id), Encrypter.encrypt(message.author.id), Encrypter.encrypt(message.author.username), message.channelId, attachments.join(ARRAY_SEPARATOR), stickers.join(ARRAY_SEPARATOR), Encrypter.encrypt(message.content)];
}

export function deserializeMessage(loggedMessage: LoggedMessage): LoggedMessage {
  return {
    ...loggedMessage,
    id: Encrypter.decrypt(loggedMessage.id),
    author_id: Encrypter.decrypt(loggedMessage.author_id),
    author_name: Encrypter.decrypt(loggedMessage.author_name),
    content: Encrypter.decrypt(loggedMessage.content)
  };
}

export function deserializeMessagePart(part: string): string[] {
  return part.split(ARRAY_SEPARATOR).filter(e => e);
}

export function getModifiedAttachments(loggedMessage: LoggedMessage, newMessage: Message): { addedAttachments: string[], removedAttachments: string[] } {
  const loggedAttachments = loggedMessage.attachments.split(ARRAY_SEPARATOR).filter(e => e);
  const addedAttachments = newMessage.attachments.filter(a => !loggedAttachments.includes(`${a.name}:${a.id}`)).map(a => `${a.name}:${a.id}`);
  const removedAttachments = loggedAttachments.filter(a => !newMessage.attachments.has(a.split(':').at(-1)!));

  return { addedAttachments, removedAttachments };
}

export function getModifiedStickers(loggedMessage: LoggedMessage, newMessage: Message): { addedStickers: string[], removedStickers: string[] } {
  const loggedStickers = loggedMessage.stickers.split(ARRAY_SEPARATOR).filter(e => e);
  const addedStickers = newMessage.stickers.filter(s => !loggedStickers.includes(`${s.name}:${s.id}`)).map(s => `${s.name}:${s.id}`);
  const removedStickers = loggedStickers.filter(s => !newMessage.stickers.has(s.split(':').at(-1)!));

  return { addedStickers, removedStickers };
}

export function isEdited(loggedMessage: LoggedMessage, newMessage: Message) {
  if (newMessage.content != loggedMessage.content) return true;

  const { addedAttachments, removedAttachments } = getModifiedAttachments(loggedMessage, newMessage);

  if (addedAttachments.length > 0 || removedAttachments.length > 0) return true;

  const { addedStickers, removedStickers } = getModifiedStickers(loggedMessage, newMessage);

  return addedStickers.length > 0 || removedStickers.length > 0;
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