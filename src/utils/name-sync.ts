import { ChatInputCommandInteraction, DiscordAPIError, ModalSubmitInteraction, RESTJSONErrorCodes, UserContextMenuCommandInteraction } from 'discord.js';
import { config } from '../config';
import { Database } from '../shared/Database';
import { E621User } from '../types';
import { getE621User, SetSeverity } from '.';

export async function syncName(interaction: ChatInputCommandInteraction | UserContextMenuCommandInteraction | ModalSubmitInteraction, userId: string, id: number | null) {
  try {
    const guild = await interaction.client.guilds.fetch(config.DISCORD_GUILD_ID!);
    const member = await guild.members.fetch(userId);

    // This check is here intentionally to avoid wasting a call
    // to the e6 api if the user cannot have their nickname set.
    const res = interaction.user.id == member.id ? 'your' : `${member.user}'s`;
    if (!member.manageable) throw new Error(`I cannot update ${res} nickname due to your position in the role hierarchy.`);

    const availableIds = await Database.getE621Ids(userId);
    let e621User: E621User | null;

    if (!id || !availableIds.includes(id))
      e621User = await getE621User(availableIds[0]);
    else
      e621User = await getE621User(id);

    if (!e621User) throw new Error("I couldn't find a user with the given ID. Check the given ID and try again, or contact an administrator.");

    const oldNickname = member.nickname;
    await member.setNickname(e621User.name);

    await interaction.editReply({
      embeds: [{
        ...SetSeverity('success'),
        description: `I've set ${res} nickname to: ${e621User.name}`,
        fields: [
          { name: 'Old Nickname', value: `${oldNickname}`, inline: true },
          { name: 'New Nickname', value: `${member.nickname}`, inline: true },
        ]
      }],
    });
  } catch (error) {
    if (error instanceof DiscordAPIError) {
      switch (error.code) {
        case RESTJSONErrorCodes.UnknownGuild: throw new Error('I was unable to fetch the server.', { cause: error });
        case RESTJSONErrorCodes.UnknownMember: throw new Error(`I was unable to fetch <@${userId}> as a server member.`, { cause: error });
        case RESTJSONErrorCodes.MissingPermissions: throw new Error(`I don't have permission to manage the nickname for <@${userId}>.`, { cause: error });
      }
    }

    throw error;
  }
}