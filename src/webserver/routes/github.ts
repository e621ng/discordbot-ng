import crypto from 'crypto';
import { Client } from 'discord.js';
import { Hono, type Context } from 'hono';

import { config } from '../../config';
import { Database } from '../../shared/Database';
import { fixPings, logDebug, removeIssueLinks  } from '../../utils';

const GITHUB_REPO_ID = 169334303;

async function handleGithubRelease(client: Client, c: Context): Promise<void> {
  logDebug('Received github release webhook');

  /*
    Intentionally read the raw request body here.
    GitHub signs the raw bytes, so parsing the body first
    would potentially invalidate the signature.
   */
  const rawBody = await c.req.raw.arrayBuffer();

  const signatureHeader = c.req.header('x-hub-signature-256');
  if (!signatureHeader) {
    console.error('Github release webhook signature missing');
    c.body(null, 401);

    return;
  }

  const signature = signatureHeader.split('=')[1];
  if (!signature) {
    console.error('Github release webhook signature malformed');
    c.body(null, 401);

    return;
  }

  const computedSignature = crypto.createHmac('sha256', config.RELEASE_SECRET!)
    .update(Buffer.from(rawBody)).digest('hex');

  // Use timingSafeEqual rather than a normal string comparison for the HMAC.
  const providedBuffer = Buffer.from(signature, 'hex');
  const computedBuffer = Buffer.from(computedSignature, 'hex');
  if (providedBuffer.length !== computedBuffer.length || !crypto.timingSafeEqual(providedBuffer, computedBuffer)) {
    console.error('Github release webhook signature mismatch');
    c.body(null, 401);

    return;
  }

  c.body(null, 200);

  void processGithubRelease(client, Buffer.from(rawBody));
}

async function processGithubRelease(client: Client, rawBody: Buffer): Promise<void> {
  try {
    const data = JSON.parse(rawBody.toString('utf-8'));

    logDebug(`Release webhook data:\n${JSON.stringify(data, null, 4)}`);

    if (data.action !== 'published' || data.repository.id !== GITHUB_REPO_ID) return;

    const settings = await Database.getOrCreateSettings(config.DISCORD_GUILD_ID!);
    if (!settings.github_release_channel) return;

    const channel = await client.channels.fetch(settings.github_release_channel);
    if (!channel || !channel.isSendable()) {
      console.error(`Github release channel ${channel ? 'not sendable' : 'found'}`);
      return;
    }

    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ];

    const date = new Date();
    let message = `## [${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}](<${data.release.html_url}>)\n\n${settings.site_breaker_role_id ? `<@&${settings.site_breaker_role_id}>\n` : ''}${await fixPings(removeIssueLinks(data.release.body))}`;

    logDebug('Sending github release message');

    const MAX_MESSAGE_LENGTH = 2000;
    const ADDITIONAL_PART = '...\n\nYou may view the full changelog on github.';

    if (message.length > MAX_MESSAGE_LENGTH) {
      const splitMessage = message.split('\n');
      message = '';

      for (const part of splitMessage) {
        if (message.length + part.length + 1 >= MAX_MESSAGE_LENGTH - ADDITIONAL_PART.length) break;
        message += `${part}\n`;
      }

      message += ADDITIONAL_PART;
    }

    const sentMessage = await channel.send(message);
    await sentMessage.startThread({
      name: data.release.tag_name
    });

    logDebug('Github webhook processed');
  } catch (e) {
    console.error('Error processing Github release webhook:', e);
  }
}

export default {
  route: '/',

  builder: (client: Client): Hono => {
    const app = new Hono();

    app.post('/release', c => handleGithubRelease(client, c));

    return app;
  }
};
