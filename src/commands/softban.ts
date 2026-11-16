import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, GuildMember, InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { deferInteraction, SetSeverity } from '../utils';
import { Command } from '../types';

class SoftbanCommand implements Command<Client<boolean>> {
  data = new SlashCommandBuilder()
    .setName('softban')
    .setDescription('Bans and immediately unbans a user to purge messages.')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The discord user to softban.')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('The reason for the softban')
        .setRequired(false)
        .setMaxLength(400)
    )
    .addNumberOption(option =>
      option
        .setName('days')
        .setDescription('How far back to delete messages (in days, default: 7 days).')
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(7)
    );

  async handleCommand(context: Client<boolean>, interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inGuild()) return;
    await deferInteraction(interaction);

    try {
      const user = interaction.options.getUser('user', true);
      const reason = interaction.options.getString('reason') ?? '';
      const seconds = (interaction.options.getNumber('days') ?? 7) * 86400;

      const guild = await context.guilds.fetch(interaction.guildId);
      let banMember: GuildMember | null = null;

      try {
        banMember = await guild.members.fetch(user.id);
      } catch (e) {
        // Member not in server.
      }

      const member = await guild.members.fetch(interaction.user.id);
      if (banMember && member.roles.highest.comparePositionTo(banMember.roles.highest) <= 0) throw new Error("You don't have permission to ban this user.");
      if (banMember && !banMember.bannable) throw new Error("I don't have permission to ban this user.");

      try {
        await guild.bans.create(user, {
          reason: (reason + ` Softban by ${interaction.user.username} (${interaction.user.id})`).trim(),
          deleteMessageSeconds: seconds
        });
      } catch (e) {
        throw new Error("Error softbanning user (couldn't ban).");
      }

      try {
        await guild.bans.remove(user, 'User was softbanned.');
      } catch (e) {
        throw new Error("Error softbanning user (couldn't remove ban).");
      }

      await interaction.editReply({
        embeds: [{
          ...SetSeverity('success'),
          description: `Successfully soft-banned ${user.tag}`,
        }],
      });
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }
}

export default new SoftbanCommand();
