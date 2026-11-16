import { ApplicationCommandType, ApplicationIntegrationType, Client, ContextMenuCommandBuilder, InteractionContextType, PermissionFlagsBits, UserContextMenuCommandInteraction } from 'discord.js';
import { Command } from '../../types';
import { deferInteraction, getRecordMessageFromDiscordId } from '../../utils';

class GetRecordsUserContextMenuCommand implements Command<Client<boolean>> {
  data = new ContextMenuCommandBuilder()
    .setName('Get Records')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setType(ApplicationCommandType.User);

  async handleCommand(context: Client<boolean>, interaction: UserContextMenuCommandInteraction): Promise<void> {
    if (!interaction.inGuild()) return;
    await deferInteraction(interaction);

    try {
      const recordMessage = await getRecordMessageFromDiscordId(interaction.targetUser.id, 1, interaction.guild!);
      if (!recordMessage) throw new Error('No records found on any linked accounts.');

      await interaction.editReply(recordMessage);
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }
}

export default new GetRecordsUserContextMenuCommand();
