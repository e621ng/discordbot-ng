import { ButtonInteraction, Client, MessageFlags } from 'discord.js';
import { Database } from '../shared/Database';

export default {
  name: 'dev-watch',
  handler: async function (client: Client, interaction: ButtonInteraction) {
    try {
      if (!interaction.guild) throw new Error('This action must be run in a guild.');

      const settings = await Database.getGuildSettings(interaction.guild.id);
      if (!settings || !settings.devwatch_role_id) throw new Error('`devwatch_role_id` was not configured. Please configure a role then try again.');
      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (!member) throw new Error('Unable to retreive the member executing this command.');

      const bot = await interaction.guild.members.fetchMe();
      const role = await interaction.guild?.roles.fetch(settings.devwatch_role_id);
      if (role?.position! > bot.roles.highest.position) throw new Error('The configured `devwatch_role_id` is higher than my highest role.');

      if (member.roles.cache.has(settings.devwatch_role_id)) {
        await member.roles.remove(settings.devwatch_role_id);
        await interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Removed role.' });
      } else {
        await member.roles.add(settings.devwatch_role_id);
        await interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Added role.' });
      }
    } catch (error: Error | any) {
      await interaction.reply({ flags: [MessageFlags.Ephemeral], content: error.message });
    }
  }
};