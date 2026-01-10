type ClientOptions = {
  clientId: string
  clientSecret: string
  clientToken: string
  redirectUri: string
  credentials: string
};

type GenerateUrlParameters = {
  state: string
  scope: string[]
  type: 'code' | 'token'
};

type TokenResponse = {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
}

type DiscordUser = {
  id: string
  username: string
  // bunch of other stuff we don't use
}

type AddMemberOptions = {
  accessToken: string
  botToken?: string
  guildId: string
  userId: string
  nickname?: string
}

const OAUTH_BASE_URL = 'https://discord.com/oauth2';
const OAUTH_API_BASE_URL = 'https://discord.com/api/oauth2';
const API_BASE_URL = 'https://discord.com/api';

export class DiscordOAuth2 {
  constructor(private options: ClientOptions) { }

  generateOauth2Url(options: GenerateUrlParameters) {
    const url = new URL(`${OAUTH_BASE_URL}/authorize`);

    const params = new URLSearchParams({
      client_id: this.options.clientId,
      response_type: options.type,
      redirect_uri: this.options.redirectUri,
      scope: options.scope.join('+'),
      state: options.state
    });

    url.search = params.toString();

    return url.toString();
  }

  async getAccessToken(code: string, scope: string[]): Promise<TokenResponse> {
    const res = await fetch(`${OAUTH_API_BASE_URL}/token`, {
      method: 'POST',
      body: new URLSearchParams({
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.options.redirectUri,
        scope: scope.join(' ')
      }).toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      }
    });

    const data = await res.json();
    return data as TokenResponse;
  }

  async getUser(accessToken: string): Promise<DiscordUser> {
    const res = await fetch(`${API_BASE_URL}/users/@me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });

    return await res.json() as DiscordUser;
  }

  async addMember(options: AddMemberOptions) {
    const res = await fetch(`${API_BASE_URL}/guilds/${options.guildId}/members/${options.userId}`, {
      method: 'PUT',
      body: JSON.stringify({
        nick: options.nickname,
        access_token: options.accessToken
      }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${this.options.clientToken}`,
        Accept: 'application/json'
      }
    });

    if (res.status < 200 || res.status >= 300) {
      console.error(`Non 200 code while joining user: ${options.userId} to discord (${res.status}):`);
      const text = await res.text();
      console.error(text);
      let data = null;

      try {
        data = JSON.parse(text);
      } catch { }

      throw data;
    }

    return await res.json();
  }

  async revokeToken(token: string) {
    const res = await fetch(`${OAUTH_API_BASE_URL}/token/revoke`, {
      method: 'POST',
      body: new URLSearchParams({
        token
      }).toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${this.options.credentials}`,
        Accept: 'application/json'
      }
    });

    return await res.json();
  }
}