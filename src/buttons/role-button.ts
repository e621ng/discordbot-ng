import { ButtonInteraction, Client, MessageFlags } from 'discord.js';
import { Database } from '../shared/Database';

export default {
  name: 'role-button',
  handler: async function (client: Client, interaction: ButtonInteraction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const roleId = await Database.getRoleFromButton(interaction.message.id);

    if (!roleId) await interaction.editReply({ content: 'Could not find role button.' });

    const guild = await interaction.guild?.fetch();
    const member = await guild?.members.fetch(interaction.user.id);

    if (!member) return interaction.editReply({ content: 'Member not found.' });

    try {
      if (member.roles.cache.has(roleId!)) {
        await member.roles.remove(roleId!);
        interaction.editReply({ content: 'Role removed.' });
      } else {
        await member.roles.add(roleId!);
        interaction.editReply({ content: 'Role added.' });
      }

    } catch (e) {
      console.error(e);
      interaction.editReply({ content: 'Could not add role. Is it higher than mine?' });
    }
  }
};