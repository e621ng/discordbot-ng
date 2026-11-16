import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command } from '../types';
import { deferInteraction, getIdFromInput, handleWhoIsInteraction } from '../utils';

class WhoisCommand implements Command<Client<boolean>> {
  data = new SlashCommandBuilder()
    .setName('whois')
    .setDescription("Find a user's e621 account from their discord account, or vice versa.")
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(option =>
      option
        .setName('user')
        .setDescription('The discord user mention, or ID, to find the e621 user of.')
        .setRequired(true)
    );

  async handleCommand(context: Client<boolean>, interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inGuild()) return;
    await deferInteraction(interaction);

    try {
      const guild = await context.guilds.fetch(interaction.guildId);
      const valueToUse = getIdFromInput(interaction.options.getString('user', true));
      await handleWhoIsInteraction(interaction, guild, valueToUse);
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }
}

export default new WhoisCommand();
