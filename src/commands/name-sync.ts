import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, InteractionContextType, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { SetSeverity, syncName } from '../utils';

export default {
  name: 'name-sync',
  data: new SlashCommandBuilder()
    .setName('name-sync')
    .setDescription('Sync your discord nickname to your e621 username.')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM)
    .addIntegerOption(option =>
      option
        .setName('id')
        .setDescription('The id of the e621 user to sync your nickname to.')
        .setRequired(false)
    ),

  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const id = interaction.options.getInteger('id');
      await syncName(interaction, interaction.user.id, id);
    } catch (error: Error | any) {
      await interaction.editReply({ embeds: [{ ...SetSeverity('error'), description: error.message }] });
    }
  }
};