import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Database } from '../shared/Database';
import { getE621User } from '../utils';
import { config } from '../config';

export default {
  name: 'whois',
  data: new SlashCommandBuilder()
    .setName('whois')
    .setDescription("Find a user's e621 account from their discord account, or vice versa.")
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The discord user to find the e621 user of.')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('id')
        .setDescription('The discord user id to find the e621 user of.')
        .setRequired(false)
    ),
  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user');
    const id = interaction.options.getString('id');

    if (!user && !id) {
      return interaction.reply({ content: 'No user or id given.', flags: [MessageFlags.Ephemeral] });
    }

    const idToUse = (user?.id ?? id) as string;

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

      interaction.reply(content);
    } else {
      interaction.reply('No e621 accounts found for this user');
    }
  }
};