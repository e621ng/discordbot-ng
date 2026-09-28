import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Hono, type Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';

import { config } from '../../config';
import { Database } from '../../shared/Database';
import { AltData, comprehensiveAltLookupFromE621, DiscordOAuth2 } from '../../utils';

const DEV_BASE_URL = `http://localhost:${config.PORT}`;
const PROD_BASE_URL = 'https://discord.e621.net';

const OAUTH_SCOPES = ['identify', 'guilds.join'];

const PAGE_TEMPLATE = fs.readFileSync(path.join(__dirname, '..', 'templates', 'page.html'), { encoding: 'utf-8' });

const SESSION_COOKIE = 'discord_oauth_session';
const SESSION_MAX_AGE = 300;

interface SessionData {
  username?: string;
  userId?: string;
  oauthState?: string;
  expiresAt: number;
}

const sessions = new Map<string, SessionData>();

const oauth = new DiscordOAuth2({
  clientId: config.DISCORD_CLIENT_ID!,
  clientSecret: config.DISCORD_CLIENT_SECRET!,
  redirectUri: `${config.DEV_MODE ? DEV_BASE_URL : PROD_BASE_URL}/callback`,
  clientToken: config.DISCORD_TOKEN!,
  credentials: Buffer
    .from(`${config.DISCORD_CLIENT_ID!}:${config.DISCORD_CLIENT_SECRET!}`)
    .toString('base64')
});

const enum JoinResponse {
  Success = 1,
  Error = 2,
  Banned = 3,
  Underage = 4
};

function createSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Cleanup expired sessions.
function cleanupSessions(): void {
  const now = Date.now();

  for (const [id, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(id);
  }
}

setInterval(cleanupSessions, 600_000).unref();

function getSession(c: Context): SessionData | undefined {
  const sessionId = getCookie(c, SESSION_COOKIE);
  if (!sessionId) return undefined;

  const session = sessions.get(sessionId);
  if (!session) return undefined;

  if (session.expiresAt <= Date.now()) {
    sessions.delete(sessionId);
    return undefined;
  }

  return session;
}

function createSession(c: Context, data: Omit<SessionData, 'expiresAt'>): void {
  const sessionId = createSessionId();
  sessions.set(sessionId, {
    ...data,
    expiresAt: Date.now() + SESSION_MAX_AGE * 1000
  });

  setCookie(c, SESSION_COOKIE, sessionId, {
    maxAge: SESSION_MAX_AGE,
    httpOnly: !config.DEV_MODE,
    secure: !config.DEV_MODE,
    sameSite: 'Lax',
    path: '/'
  });
}

function destroySession(c: Context): void {
  const sessionId = getCookie(c, SESSION_COOKIE);
  if (sessionId)
    sessions.delete(sessionId);

  deleteCookie(c, SESSION_COOKIE, {
    path: '/'
  });
}

async function joinGuild(code: string, userId: string, username: string): Promise<JoinResponse> {
  let tokenResponse;

  try {
    if (Number.isNaN(Number(userId)) || !username) return JoinResponse.Error;

    tokenResponse = await oauth.getAccessToken(code, OAUTH_SCOPES);
    const user = await oauth.getUser(tokenResponse.access_token);
    if (!user.id || !user.username) {
      console.error(`Error joining user (${userId}) to discord. User object missing id or username.`, user);
      return JoinResponse.Error;
    }

    const id = Number(userId);
    await Database.putUser(id, user);

    const alts = await comprehensiveAltLookupFromE621(id, null);
    if (await checkAltsForFullBans([alts])) return JoinResponse.Banned;

    const response = await oauth.addMember({
      accessToken: tokenResponse.access_token,
      guildId: config.DISCORD_GUILD_ID!,
      userId: user.id,
      nickname: username
    });

    if (config.DEBUG) console.log(response);

    if (!response) return JoinResponse.Error;
  } catch (e: any) {
    switch (e.code) {
      case 40007:
        return JoinResponse.Banned;

      case 20024:
        return JoinResponse.Underage;
    }

    console.error(`Error joining user (${userId}) to discord:`, e);
    return JoinResponse.Error;
  } finally {
    if (tokenResponse)
      await oauth.revokeToken(tokenResponse.access_token);
  }

  return JoinResponse.Success;
}

async function handleInitial(c: Context): Promise<Response> {
  const query = c.req.query();

  const username = query.username;
  const userId = query.user_id;
  const time = query.time;
  const hash = query.hash;
  if (!username || !userId || !time || !hash)
    return sendBadRequest(c, 'Missing parameters');

  const timestamp = Number(time);
  if (Number.isNaN(timestamp) || Date.now() / 1000 > timestamp)
    return render(c, 403, 'You took too long to authorize the request. Please try again.');

  const authString = `${username} ${userId} ${time} ${config.LINK_SECRET}`;
  const digest = crypto.createHash('sha256').update(authString).digest('hex');
  if (hash !== digest) {
    console.error(`Bad auth: ${hash} ${digest}`);
    return sendForbidden(c, 'Bad auth');
  }

  const oauthState = crypto.randomBytes(16).toString('hex');
  const oauthUrl = oauth.generateOauth2Url({
    state: oauthState,
    scope: OAUTH_SCOPES,
    type: 'code'
  });

  createSession(c, { username, userId, oauthState });

  return c.redirect(oauthUrl);
}

async function handleCallback(c: Context): Promise<Response> {
  const session = getSession(c);
  if (!session?.userId || !session.username || !session.oauthState)
    return sendForbidden(c, 'Session details missing');

  const query = c.req.query();
  const state = query.state;
  if (state !== session.oauthState) {
    console.error('OAuth state mismatch on discord joining');
    return sendForbidden(c, 'OAuth state mismatch');
  }

  const code = query.code;

  if (!code)
    return sendBadRequest(c, 'Missing OAuth code');

  const userId = session.userId;
  const username = session.username;

  destroySession(c);

  try {
    const response = await joinGuild(code, userId, username);

    switch (response) {
      case JoinResponse.Error:
        console.error(`Error joining user: ${username} (${userId})`);
        return sendInternalServerError(c, 'Unable to join user to guild. Retry later. If issue persists, please contact staff.');

      case JoinResponse.Banned:
        return sendForbidden(c, 'User is banned.');

      case JoinResponse.Underage:
        return sendForbidden(c, 'Discord account flagged as underage by discord.');
    }
  } catch (e) {
    console.error(e);
    return sendInternalServerError(c);
  }

  return render(c, 200, 'Success', `You have been added to the server. <a href="https://discord.com/channels/${config.DISCORD_GUILD_ID}">See you there.</a>`);
}

function sendInternalServerError(c: Context, message: string = ''): Response {
  return render(c, 500, 'Internal Server Error', message);
}

function sendForbidden(c: Context, message: string = ''): Response {
  return render(c, 403, 'Forbidden', message);
}

function sendBadRequest(c: Context, message: string = ''): Response {
  return render(c, 400, 'Bad Request', message);
}

function render(c: Context, code: number, title: string = '', message: string = ''): Response {
  const html = PAGE_TEMPLATE
    .replaceAll('{{ title }}', title)
    .replaceAll('{{ message }}', message);

  return c.html(html, code as any);
}

async function checkAltsForFullBans(altData: AltData[]): Promise<boolean> {
  for (const data of altData) {
    if (data.type === 'discord') {
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

export default {
  route: '/',

  builder: (): Hono => {
    const app = new Hono();

    app.get('/', c => handleInitial(c));
    app.get('/callback', c => handleCallback(c));

    return app;
  }
};
