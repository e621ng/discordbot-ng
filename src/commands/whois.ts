import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { deferInteraction, getIdFromInput, handleWhoIsInteraction } from '../utils';

export default {
  name: 'whois',
  data: new SlashCommandBuilder()
    .setName('whois')
    .setDescription("Find a user's e621 account from their discord account, or vice versa.")
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(option =>
      option
        .setName('user')
        .setDescription('The discord user mention, or ID, to find the e621 user of.')
        .setRequired(true)),

  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild()) return;
    await deferInteraction(interaction);

    const valueToUse = getIdFromInput(interaction.options.getString('user', true));
    await handleWhoIsInteraction(interaction, valueToUse);
  }
};
