import { ApplicationCommandType, ApplicationIntegrationType, Client, ContextMenuCommandBuilder, InteractionContextType, PermissionFlagsBits, UserContextMenuCommandInteraction } from 'discord.js';
import { Command } from '../../types';
import { deferInteraction, getNoteMessage } from '../../utils';

class ListNotesUserContextMenuCommand implements Command<Client<boolean>> {
  data = new ContextMenuCommandBuilder()
    .setName('List Notes')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setType(ApplicationCommandType.User);

  async handleCommand(context: Client<boolean>, interaction: UserContextMenuCommandInteraction): Promise<void> {
    if (!interaction.inGuild()) return;
    await deferInteraction(interaction);

    try {
      const noteMessage = await getNoteMessage(interaction.targetUser.id, 1);
      if (!noteMessage) throw new Error(`No notes were found for ${interaction.targetUser.tag}`);

      await interaction.editReply(noteMessage);
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }
}

export default new ListNotesUserContextMenuCommand();
