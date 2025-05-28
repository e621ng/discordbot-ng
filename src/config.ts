import dotenv from 'dotenv';

dotenv.config();

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_GUILD_ID, LINK_SECRET, E621_BASE_URL, E926_BASE_URL, REDIS_URL, PORT } = process.env;

export const config = {
  DISCORD_TOKEN,
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_GUILD_ID,
  LINK_SECRET,
  E621_BASE_URL,
  E926_BASE_URL,
  PORT: parseInt(PORT as string),
  REDIS_URL,
  DEV_MODE: process.env.npm_lifecycle_event == 'dev'
};

for (const [key, val] of Object.entries(config)) {
  if (val === undefined) {
    throw new Error(`${key} is undefined in config`);
  }
}