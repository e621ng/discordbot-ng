import { Client, DiscordAPIError, GuildMember, RESTJSONErrorCodes } from 'discord.js';

export async function fetchGuildMember(context: Client, guildId: string, userId: string): Promise<GuildMember> {
  try {
    const guild = await context.guilds.fetch(guildId);
    return await guild.members.fetch(userId);
  } catch (error: Error | any) {
    if (error instanceof DiscordAPIError) {
      switch (error.code) {
        case RESTJSONErrorCodes.InvalidGuild: throw new Error(`The provided guild id \`${guildId}\` is invalid.`, { cause: error });
        case RESTJSONErrorCodes.UnknownGuild: throw new Error(`Unable to fetch \`${guildId}\` as a guild.`, { cause: error });
        case RESTJSONErrorCodes.UnknownMember: throw new Error(`Unable to fetch <@${userId}> as a server member.`, { cause: error });
      }
    }

    throw error;
  }
}