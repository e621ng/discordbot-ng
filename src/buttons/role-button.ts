import { ButtonInteraction, Client, MessageFlags } from 'discord.js';
import { Database } from '../shared/Database';
import { Button } from '../types';

class RoleButtonButton implements Button<Client> {
  id = 'role-button';

  async execute(context: Client<boolean>, interaction: ButtonInteraction, ...args: any[]): Promise<void> {
    if (!interaction.inGuild()) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const roleId = await Database.getRoleFromButton(interaction.message.id);
      if (!roleId) throw new Error("I couldn't find an associated role ID with this button.");

      const guild = await context.guilds.fetch(interaction.guildId);
      const member = await guild.members.fetch(interaction.user.id);
      if (!member) throw new Error('I was unable to fetch you as a member.');

      const bot = await guild.members.fetchMe();
      const role = await guild.roles.fetch(roleId);
      if (!role) throw new Error("The configured role for this button doesn't exist.");
      if (role.position > bot.roles.highest.position) throw new Error(`The configured role (\`${role.name}\`) is higher than my highest role.`);

      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
        await interaction.editReply({ content: 'Role removed.' });
      } else {
        await member.roles.add(roleId);
        await interaction.editReply({ content: 'Role Added' });
      }
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }
}

export default new RoleButtonButton();