import crypto from 'crypto';

const DISCORD_PNG_ADDITIONAL_BYTE_LENGTH = 26;
const END_PNG_BYTES = 12;

const DISCORD_JPG_START_OFFSET = 3;
const DISCORD_JPG_REMOVE_BYTE_LENGTH = 23;
const DISCORD_JPG_REINSERT = Buffer.from([0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]);
const DISCORD_JPG_REINSERT_BYTE_LENGTH = DISCORD_JPG_REINSERT.byteLength;

export const ALLOWED_MIMETYPES = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'video/mp4', 'video/webm'];

export function calculateMD5(data: Buffer): string {
  return crypto.createHash('md5').update(data).digest('hex');
}

export async function downloadFile(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);

    const mimeType = res.headers.get('Content-Type')!;

    if (!ALLOWED_MIMETYPES.includes(mimeType)) return null;

    const data = await res.arrayBuffer();

    let finalData: Buffer;

    if (mimeType == 'image/png') {
      const startOffset = data.byteLength - DISCORD_PNG_ADDITIONAL_BYTE_LENGTH - END_PNG_BYTES;
      const correctedData = Buffer.alloc(data.byteLength - DISCORD_PNG_ADDITIONAL_BYTE_LENGTH);
      const buff = Buffer.from(data);
      buff.copy(correctedData, 0, 0, startOffset);
      buff.copy(correctedData, startOffset, startOffset + DISCORD_PNG_ADDITIONAL_BYTE_LENGTH);
      finalData = correctedData;
    } else if (mimeType == 'image/jpg' || mimeType == 'image/jpeg') {
      const correctedData = Buffer.alloc(data.byteLength - DISCORD_JPG_REMOVE_BYTE_LENGTH + DISCORD_JPG_REINSERT_BYTE_LENGTH);
      const buff = Buffer.from(data);
      buff.copy(correctedData, 0, 0, DISCORD_JPG_START_OFFSET);
      DISCORD_JPG_REINSERT.copy(correctedData, DISCORD_JPG_START_OFFSET);
      buff.copy(correctedData, DISCORD_JPG_REMOVE_BYTE_LENGTH - DISCORD_JPG_START_OFFSET, DISCORD_JPG_START_OFFSET + DISCORD_JPG_REMOVE_BYTE_LENGTH);
      finalData = correctedData;
    } else {
      finalData = Buffer.from(data);
    }

    return finalData;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function calculateMD5FromURL(url: string): Promise<string | null> {
  try {
    const file = await downloadFile(url);
    if (!file) return null;
    return calculateMD5(file);
  } catch (e) {
    console.error(e);
    return null;
  }
}