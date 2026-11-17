import { ApplicationCommandType, ApplicationIntegrationType, Client, ContextMenuCommandBuilder, InteractionContextType, ModalBuilder, PermissionFlagsBits, TextInputStyle, UserContextMenuCommandInteraction } from 'discord.js';
import { Database } from '../../shared/Database';
import { Command } from '../../types';
import { createTextInput, deferInteraction, syncName } from '../../utils';

class SyncNameUserContextMenuCommand implements Command<Client<boolean>> {
  data = new ContextMenuCommandBuilder()
    .setName('Sync Name')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .setType(ApplicationCommandType.User);

  async handleCommand(context: Client<boolean>, interaction: UserContextMenuCommandInteraction): Promise<void> {
    if (!interaction.inGuild()) return;

    try {
      const guild = await context.guilds.fetch(interaction.guildId);
      const member = await guild.members.fetch(interaction.targetId);
      const moderator = await guild.members.fetch(interaction.user.id);

      if (!member.manageable) throw new Error("I don't have permissions to update this user's username.");
      if (moderator.roles.highest.comparePositionTo(member.roles.highest) <= 0) throw new Error("You don't have permissions to sync this user's name.");

      const availableIds = await Database.getE621Ids(interaction.user.id);
      if (availableIds.length > 1) {
        const modal = new ModalBuilder()
          .setCustomId(`sync-name-modal_${interaction.targetId}`)
          .setTitle(`Syncing ${member ? member.displayName : interaction.targetId}'s name`);

        const inputLabel = createTextInput('id', 'User has multiple linked accounts. Provide ID', null, false, TextInputStyle.Short, null, null);
        modal.addLabelComponents(inputLabel);

        await interaction.showModal(modal);
        return;
      }

      await deferInteraction(interaction);
      await syncName(interaction, member, null);
    } catch (error: Error | any) {
      if (interaction.deferred) await interaction.editReply({ content: error.message }).catch(() => { });
      else await interaction.reply({ content: error.message }).catch(() => { });
    }
  }
}

export default new SyncNameUserContextMenuCommand();
