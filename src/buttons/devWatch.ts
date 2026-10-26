import { ButtonInteraction, Client, MessageFlags } from 'discord.js';
import { Database } from '../shared/Database';
import { Button } from '../types';

class DevWatchButton implements Button<Client> {
  id = 'dev-watch';

  async execute(context: Client<boolean>, interaction: ButtonInteraction): Promise<void> {
    if (!interaction.inGuild()) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const settings = await Database.getOrCreateSettings(interaction.guildId);
      if (!settings.devwatch_role_id) throw new Error('`devwatch_role_id` was not configured. Please configure a role then try again.');

      const guild = await context.guilds.fetch(interaction.guildId);
      const member = await guild.members.fetch(interaction.user.id);
      if (!member) throw new Error('Unable to fetch the member executing this command.');

      const bot = await guild.members.fetchMe();
      const role = await guild.roles.fetch(settings.devwatch_role_id);
      if (!role) throw new Error('The configured `devwatch_role_id` does not exist.');
      if (role.position > bot.roles.highest.position) throw new Error('The configured `devwatch_role_id` is higher than my highest role.');

      if (member.roles.cache.has(settings.devwatch_role_id)) {
        await member.roles.remove(settings.devwatch_role_id);
        await interaction.editReply({ content: 'Removed role.' });
      } else {
        await member.roles.add(settings.devwatch_role_id);
        await interaction.editReply({ content: 'Added role.' });
      }
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }
}

export default new DevWatchButton();
