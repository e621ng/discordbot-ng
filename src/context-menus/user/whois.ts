import { ApplicationIntegrationType, Client, InteractionContextType, PermissionFlagsBits, ContextMenuCommandBuilder, ApplicationCommandType, UserContextMenuCommandInteraction } from 'discord.js';
import { Command } from '../../types';
import { deferInteraction, handleWhoIsInteraction } from '../../utils';

class WhoisUserContextMenuCommand implements Command<Client<boolean>> {
  data = new ContextMenuCommandBuilder()
    .setName('Whois')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setType(ApplicationCommandType.User);

  async handleCommand(context: Client<boolean>, interaction: UserContextMenuCommandInteraction): Promise<void> {
    if (!interaction.inGuild()) return;
    await deferInteraction(interaction);

    try {
      const guild = await context.guilds.fetch(interaction.guildId);
      await handleWhoIsInteraction(interaction, guild, interaction.targetId);
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }
}

export default new WhoisUserContextMenuCommand();
