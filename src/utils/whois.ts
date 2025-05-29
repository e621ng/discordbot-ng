import { CommandInteraction, MessageFlags } from 'discord.js';
import { config } from '../config';
import { Database } from '../shared/Database';

export async function handleWhoIsInteraction(interaction: CommandInteraction, idToUse: string, ephemeral = false) {
  const results = await Database.getE621Ids(idToUse);

  if (results.length > 0) {
    const mappedResults = results.map(e => `- ${config.E621_BASE_URL}/users/${e}\n`);

    const alts: string[] = [];

    for (const e621Id of results) {
      const discordIds = await Database.getDiscordIds(e621Id);

      for (const discordId of discordIds) {
        if (discordId != idToUse && !alts.includes(discordId)) alts.push(discordId);
      }
    }

    let content = `<@${idToUse}>'s e621 account(s):\n${mappedResults}`;

    if (alts.length > 0) {
      const mappedAlts = alts.map(id => `- <@${id}>\n`);
      content += `\n\nDiscord alts found:\n${mappedAlts}`;
    }

    if (ephemeral) interaction.reply({ content, flags: [MessageFlags.Ephemeral] });
    else interaction.reply(content);
  } else {
    if (ephemeral) interaction.reply({ content: 'No e621 accounts found for this user', flags: [MessageFlags.Ephemeral] });
    else interaction.reply('No e621 accounts found for this user');
  }
}