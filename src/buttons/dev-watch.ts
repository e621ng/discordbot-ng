import { ActionRowBuilder, ButtonInteraction, Client, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } from 'discord.js';
import { ticketCooldownMap } from '../shared/ticket-cooldown';
import { Database } from '../shared/Database';

export default {
  name: 'dev-watch',
  handler: async function (client: Client, interaction: ButtonInteraction) {
    const member = await interaction.guild!.members.fetch(interaction.user.id);

    if (!member) return await interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'There was an error. Please try again later.' });

    const settings = await Database.getGuildSettings(interaction.guild!.id);

    if (!settings || !settings.devwatch_role_id) return await interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'There was an error. Please try again later.' });

    if (member.roles.cache.has(settings.devwatch_role_id)) {
      await member.roles.remove(settings.devwatch_role_id);
      await interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Removed role.' });
    } else {
      await member.roles.add(settings.devwatch_role_id);
      await interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Added role.' });
    }
  }
};