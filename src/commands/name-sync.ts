import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, InteractionContextType, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { config } from '../config';
import { Command } from '../types';
import { syncName } from '../utils';

class NameSyncCommand implements Command<Client<boolean>> {
  data = new SlashCommandBuilder()
    .setName('name-sync')
    .setDescription('Sync your discord nickname to your e621 name.')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM)
    .addIntegerOption(option =>
      option
        .setName('id')
        .setDescription('The id of the e621 user to sync your nickname to.')
        .setRequired(false)
    );

  async handleCommand(context: Client<boolean>, interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inGuild()) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const id = interaction.options.getInteger('id');

      const guild = await interaction.client.guilds.fetch(config.DISCORD_GUILD_ID!);
      if (!guild) throw new Error('Unable to retrieve guild.');

      const member = await guild.members.fetch(interaction.user.id);
      if (!member) throw new Error('An error occured while trying to fetch you as a member.');

      await syncName(interaction, member, id);
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }
}

export default new NameSyncCommand();
