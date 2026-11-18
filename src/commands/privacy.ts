import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, InteractionContextType, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { config } from '../config';
import { SetSeverity } from '../utils';

export default {
  name: 'privacy',
  data: new SlashCommandBuilder()
    .setName('privacy')
    .setDescription('Get a link to the privacy policy.')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM),
  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    if (!config.PRIVACY_POLICY_URL) {
      await interaction.reply({
        embeds: [{
          ...SetSeverity('warning'),
          description: 'Hmm, no privacy policy seems to have been set. This might be a mistake. Please notify a staff member.',
        }],

        flags: MessageFlags.Ephemeral,
      });

      return;
    }

    await interaction.reply({
      embeds: [{
        ...SetSeverity('info'),
        description: `You can view my privacy policy here: ${config.PRIVACY_POLICY_URL}`,
      }],

      flags: MessageFlags.Ephemeral,
    });
  }
};
