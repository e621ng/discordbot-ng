import { ApplicationIntegrationType, Client, InteractionContextType, PermissionFlagsBits, ContextMenuCommandBuilder, ApplicationCommandType, UserContextMenuCommandInteraction, MessageFlags } from 'discord.js';
import { handleWhoIsInteraction } from '../utils';

export default {
  name: 'Whois',
  data: new ContextMenuCommandBuilder()
    .setName('Whois')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setType(ApplicationCommandType.User),
  handler: async function (context: Client, interaction: UserContextMenuCommandInteraction) {
    if (!interaction.inGuild()) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const guild = await context.guilds.fetch(interaction.guildId);
      const idToUse = interaction.targetUser.id;

      await handleWhoIsInteraction(interaction, guild, idToUse);
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }
};
