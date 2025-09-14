import { ActionRowBuilder, ButtonInteraction, Client, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags, ChannelType, PermissionFlagsBits, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Database } from '../shared/Database';

export default {
  name: 'claim-ticket',
  handler: async function (client: Client, interaction: ButtonInteraction) {
    const channel = await interaction.channel?.fetch();

    if (!channel || !channel.isThread() || !channel.isSendable() || channel.type != ChannelType.PrivateThread)
      return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Oops. Something went wrong.' });

    if (!interaction.memberPermissions) return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'An error has occurred.' });

    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'You do not have permission to claim tickets.' });

    const guild = await client.guilds.fetch(interaction.guildId!);

    const guildSettings = await Database.getGuildSettings(guild.id);

    if (!guildSettings || !guildSettings.private_help_role_id)
      return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Failed to claim ticket.' });

    const closeButton = new ButtonBuilder()
      .setCustomId('close-ticket')
      .setLabel('Click here if you no longer need help')
      .setStyle(ButtonStyle.Danger);

    const unclaimButton = new ButtonBuilder()
      .setCustomId('unclaim-ticket')
      .setLabel('Unclaim ticket')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(closeButton, unclaimButton);

    await interaction.message.edit({
      content: `${interaction.message.content}\n\nClaimed by: ${interaction.user}`,
      components: [row]
    });

    await interaction.reply({ content: `Ticket claimed by ${interaction.user}.` });
  }
};