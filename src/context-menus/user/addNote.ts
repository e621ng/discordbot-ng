import { ApplicationCommandType, ApplicationIntegrationType, Client, ContextMenuCommandBuilder, InteractionContextType, ModalBuilder, PermissionFlagsBits, TextInputStyle, UserContextMenuCommandInteraction } from 'discord.js';
import { Command } from '../../types';
import { createTextInput } from '../../utils';

class AddNoteUserContextMenuCommand implements Command<Client<boolean>> {
  data = new ContextMenuCommandBuilder()
    .setName('Add Note')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setType(ApplicationCommandType.User);

  async handleCommand(context: Client<boolean>, interaction: UserContextMenuCommandInteraction): Promise<void> {
    if (!interaction.inGuild()) return;

    try {
      const guild = await context.guilds.fetch(interaction.guildId);
      const member = await guild.members.fetch(interaction.targetUser.id);

      const modal = new ModalBuilder()
        .setCustomId(`add-note-modal_${interaction.targetUser.id}`)
        .setTitle(`Adding note to ${member ? member.displayName : interaction.targetUser.id}`);

      const inputLabel = createTextInput('note-message', 'Note Message', null, true, TextInputStyle.Paragraph, 1500, 2);
      modal.addLabelComponents(inputLabel);

      await interaction.showModal(modal);
    } catch (error: Error | any) {
      await interaction.reply({ content: error.message }).catch(() => {});
    }
  }
}

export default new AddNoteUserContextMenuCommand();
