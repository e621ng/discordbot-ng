import express, { Request, Response } from 'express';
import { config } from '../config';
import { Database } from '../shared/Database';
import crypto from 'crypto';
import session from 'express-session';
import MemoryStore from 'memorystore';
import fs from 'fs';
import path from 'path';
import { Client } from 'discord.js';
import bodyParser from 'body-parser';
import { fixPings, removeIssueLinks } from '../utils/github-user-utils';
import { logDebug } from '../utils/debug-utils';
import { AltData, comprehensiveAltLookupFromE621, DiscordOAuth2 } from '../utils';

declare module 'express-session' {
  interface SessionData {
    username: string;
    userId: string;
    oauthState: string;
  }
}
const GITHUB_REPO_ID = 169334303;

const DEV_BASE_URL = `http://localhost:${config.PORT}`;
const PROD_BASE_URL = 'https://discord.e621.net';

const OAUTH_SCOPES = ['identify', 'guilds.join'];

const PAGE_TEMPLATE = fs.readFileSync(path.join(__dirname, 'templates', 'page.html'), { encoding: 'utf-8' });

const oauth = new DiscordOAuth2({
  clientId: config.DISCORD_CLIENT_ID!,
  clientSecret: config.DISCORD_CLIENT_SECRET!,
  redirectUri: `${config.DEV_MODE ? DEV_BASE_URL : PROD_BASE_URL}/callback`,
  clientToken: config.DISCORD_TOKEN!,
  credentials: Buffer.from(`${config.DISCORD_CLIENT_ID!}:${config.DISCORD_CLIENT_SECRET!}`).toString('base64')
});

const enum JoinResponse {
  Success = 1,
  Error = 2,
  Banned = 3,
  Underage = 4
};

async function joinGuild(code: string, userId: string, username: string): Promise<JoinResponse> {
  let tokenResponse;
  try {
    if (Number.isNaN(userId)) return JoinResponse.Error;
    if (!username) return JoinResponse.Error;

    const id = Number(userId);

    tokenResponse = await oauth.getAccessToken(code, OAUTH_SCOPES);

    const user = await oauth.getUser(tokenResponse.access_token);

    if (!user.id || !user.username) {
      console.error(`Error joining user (${userId}) to discord. User object missing id or username.`);
      console.error(user);
      return JoinResponse.Error;
    }

    await Database.putUser(id, user);

    const alts = await comprehensiveAltLookupFromE621(id, null);

    if (await checkAltsForFullBans([alts])) return JoinResponse.Banned;

    await oauth.addMember({
      accessToken: tokenResponse.access_token,
      guildId: config.DISCORD_GUILD_ID!,
      userId: user.id,
      nickname: username
    });
  } catch (e: any) {
    if (e.code == 40007) return JoinResponse.Banned;
    else if (e.code == 20024) return JoinResponse.Underage;

    console.error(`Error joining user (${userId}) to discord:`);
    console.error(e);
    return JoinResponse.Error;
  } finally {
    if (tokenResponse) await oauth.revokeToken(tokenResponse.access_token);
  }

  return JoinResponse.Success;
}

async function handleInitial(req: Request, res: Response): Promise<any> {
  const { username, user_id, time, hash } = req.query;

  if (!username || !user_id || !time || !hash) {
    return sendBadRequest(res, 'Missing parameters');
  }

  if (Number.isNaN(time) || Date.now() / 1000 > Number(time)) {
    return render(res, 403, 'You took too long to authorize the request. Please try again.');
  }

  const authString = `${username} ${user_id} ${time} ${config.LINK_SECRET}`;

  const digest = crypto.createHash('sha256').update(authString).digest('hex');

  if (hash !== digest) {
    console.error(`Bad auth: ${hash} ${digest}`);
    return sendForbidden(res, 'Bad auth');
  }

  const oauthState = crypto.randomBytes(16).toString('hex');

  const oauthUrl = await oauth.generateOauth2Url({
    state: oauthState,
    scope: OAUTH_SCOPES,
    type: 'code'
  });

  req.session.username = username as string;
  req.session.userId = user_id as string;
  req.session.oauthState = oauthState;

  req.session.save((e) => {
    if (e) {
      console.error('Error saving session:');
      console.error(e);
      return sendInteralServerError(res);
    }

    res.redirect(oauthUrl);
  });
}

async function handleCallback(req: Request, res: Response): Promise<any> {
  if (!req.session.userId || !req.session.username || !req.session.oauthState) {
    return sendForbidden(res, 'Session details missing');
  }

  const state = req.query.state as string;

  if (state != req.session.oauthState) {
    console.error('OAuth state mismatch on discord joining');
    return sendForbidden(res, 'OAuth state mismatch');
  }

  const code = req.query.code as string;

  const userId = req.session.userId;
  const username = req.session.username;

  req.session.destroy((e) => {
    if (e) console.error(e);
  });

  try {
    const response = await joinGuild(code, userId, username);
    if (response == JoinResponse.Error) {
      console.error(`Error joining user: ${username} (${userId})`);
      return sendInteralServerError(res, 'Unable to join user to guild. Retry later. If issue persists, please contact staff.');
    } else if (response == JoinResponse.Banned) {
      return sendForbidden(res, 'User is banned.');
    } else if (response == JoinResponse.Underage) {
      return sendForbidden(res, 'Discord account flagged as underage by discord.');
    }
  } catch (e) {
    console.error(e);
    return sendInteralServerError(res);
  }

  render(res, 200, 'Success', `You have been added to the server. <a href="https://discord.com/channels/${config.DISCORD_GUILD_ID}">See you there.</a>`);
}

function sendInteralServerError(res: Response, message: string = '') {
  render(res, 500, 'Internal Server Error', message);
}

function sendForbidden(res: Response, message: string = '') {
  render(res, 403, 'Forbidden', message);
}

function sendBadRequest(res: Response, message: string = '') {
  render(res, 400, 'Bad Request', message);
}

function render(res: Response, code: number, title: string = '', message: string = '') {
  res.status(code).setHeader('Content-Type', 'text/html').send(PAGE_TEMPLATE.replaceAll('{{ title }}', title).replaceAll('{{ message }}', message));
}

async function handleGithubRelease(client: Client, req: Request, res: Response): Promise<any> {
  logDebug('Received github release webhook');
  const signature = (req.headers['x-hub-signature-256'] as string).split('=')[1];
  const computedSignature = crypto.createHmac('sha256', config.RELEASE_SECRET!).update(req.body).digest('hex');

  if (signature !== computedSignature) {
    console.error('Github release webhook signature mismatch');
    return res.sendStatus(401);
  }

  res.sendStatus(200);

  const data = JSON.parse(req.body);
  logDebug(`Release webhook data:\n${JSON.stringify(data, null, 4)}`);

  if (data.action != 'published' || data.repository.id != GITHUB_REPO_ID) return;

  const settings = await Database.getGuildSettings(config.DISCORD_GUILD_ID!);

  if (!settings || !settings.github_release_channel) return;

  const channel = await client.channels.fetch(settings.github_release_channel);

  if (!channel || !channel.isSendable()) {
    console.error(`Github release channel ${channel ? 'sendable' : 'found'}`);
    return;
  }

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const date = new Date();

  let message = `## [${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}](<${data.release.html_url}>)\n\n${await fixPings(removeIssueLinks(data.release.body))}`;

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
  await sentMessage.startThread({ name: data.release.tag_name });

  logDebug('Github webhook processed');
}

async function checkAltsForFullBans(altData: AltData[]): Promise<boolean> {
  for (const data of altData) {
    if (data.type == 'discord') {
      try {
        const banData = await Database.getBan(data.thisId as string);
        if (banData?.full_ban) return true;
      } catch (e) {
        console.error(e);
      }
    }

    if (await checkAltsForFullBans(data.alts)) return true;
  }

  return false;
}

export function initializeWebserver(client: Client) {
  const app = express();

  const Store = MemoryStore(session);

  app.set('trust proxy', 1);

  app.use(session({
    secret: config.DISCORD_CLIENT_SECRET!,
    cookie: {
      secure: !config.DEV_MODE,
      httpOnly: !config.DEV_MODE,
      sameSite: false,
      maxAge: 300000
    },
    store: new Store({
      checkPeriod: 600000,
    }),
    resave: false,
    saveUninitialized: false
  }));

  app.get('/', handleInitial);
  app.get('/callback', handleCallback);

  app.use(bodyParser.raw({ type: 'application/json' }));
  app.post('/release', handleGithubRelease.bind(null, client));

  app.listen(config.PORT, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Listening on port ${config.PORT}`);
  });
}