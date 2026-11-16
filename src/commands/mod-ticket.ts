import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command } from '../types';
import { openModTicketModal } from '../utils';

class ModTicketCommand implements Command<Client<boolean>> {
  data = new SlashCommandBuilder()
    .setName('mod-ticket')
    .setDescription('Opens a mod private ticket and pulls the user into it.')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to pull in to the ticket.')
        .setRequired(true)
    );

  async handleCommand(context: Client<boolean>, interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inGuild()) return;

    try {
      const user = interaction.options.getUser('user', true);

      const guild = await context.guilds.fetch(interaction.guildId);
      const member = await guild.members.fetch(user.id);
      if (!member) throw new Error('Unable to fetch the member.');

      await openModTicketModal(interaction, member);
    } catch (error: Error | any) {
      await interaction.reply({ content: error.message }).catch(() => {});
    }
  }
}

export default new ModTicketCommand();
