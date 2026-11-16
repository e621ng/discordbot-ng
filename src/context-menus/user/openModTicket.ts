import { ApplicationIntegrationType, Client, InteractionContextType, PermissionFlagsBits, ContextMenuCommandBuilder, ApplicationCommandType, UserContextMenuCommandInteraction } from 'discord.js';
import { Command } from '../../types';
import { openModTicketModal } from '../../utils';

class OpenModTicketUserContextMenuCommand implements Command<Client<boolean>> {
  data = new ContextMenuCommandBuilder()
    .setName('Open Mod Ticket')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setType(ApplicationCommandType.User);

  async handleCommand(context: Client<boolean>, interaction: UserContextMenuCommandInteraction): Promise<void> {
    if (!interaction.inGuild()) return;

    try {
      const guild = await context.guilds.fetch(interaction.guildId);
      const member = await guild.members.fetch(interaction.targetUser.id);
      if (!member) throw new Error('I was unable to fetch the target member.');

      await openModTicketModal(interaction, member);
    } catch (error: Error | any) {
      await interaction.reply({ content: error.message }).catch(() => {});
    }
  }
}

export default new OpenModTicketUserContextMenuCommand();
