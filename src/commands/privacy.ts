import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, ContextMenuCommandInteraction, InteractionContextType, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { config } from '../config';
import { Command } from '../types';

class PrivacyCommand implements Command<Client<boolean>> {
  data = new SlashCommandBuilder()
    .setName('privacy')
    .setDescription('Get a link to the privacy policy.')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM);

  async handleCommand(context: Client<boolean>, interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction): Promise<void> {
    await interaction.reply({ content: `You can view my privacy policy here: ${config.PRIVACY_POLICY_URL}`, flags: MessageFlags.Ephemeral });
  }
}

export default new PrivacyCommand();
