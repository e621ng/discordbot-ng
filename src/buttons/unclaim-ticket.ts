import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChannelType, Client, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { Database } from '../shared/Database';

export default {
  name: 'unclaim-ticket',
  handler: async function (client: Client, interaction: ButtonInteraction) {
    const channel = await interaction.channel?.fetch();

    if (!channel || !channel.isThread() || !channel.isSendable() || channel.type != ChannelType.PrivateThread)
      return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Oops. Something went wrong.' });

    if (!interaction.memberPermissions) return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'An error has occurred.' });

    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'You do not have permission to unclaim this ticket.' });

    if (!interaction.message.content.split('\n').at(-1)!.includes(`<@${interaction.user.id}>`)) return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'You did not claim this ticket.' });

    const guild = await client.guilds.fetch(interaction.guildId!);

    const guildSettings = await Database.getGuildSettings(guild.id);

    if (!guildSettings || !guildSettings.private_help_role_id)
      return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Failed to unclaim ticket.' });

    const closeButton = new ButtonBuilder()
      .setCustomId('close-ticket')
      .setLabel('Click here if you no longer need help')
      .setStyle(ButtonStyle.Danger);

    const claimButton = new ButtonBuilder()
      .setCustomId('claim-ticket')
      .setLabel('Claim ticket')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(closeButton, claimButton);

    await interaction.message.edit({
      content: interaction.message.content.split('\n').slice(0, -1).join('\n').trim(),
      components: [row]
    });

    await interaction.reply({ content: 'Ticket unclaimed.', flags: [MessageFlags.Ephemeral] });
  }
};