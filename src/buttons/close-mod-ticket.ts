import { ButtonInteraction, Client, MessageFlags, ChannelType, PermissionFlagsBits } from 'discord.js';

export default {
  name: 'close-mod-ticket',
  handler: async function (client: Client, interaction: ButtonInteraction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    const channel = await interaction.channel?.fetch();
    const guild = await interaction.guild?.fetch();
    const member = await guild?.members.fetch(interaction.user.id);

    if (!channel || !channel.isThread() || !channel.isSendable() || channel.type != ChannelType.PrivateThread || !member)
      return interaction.editReply({ content: 'Oops. Something went wrong. Please report this to a staff member.' });

    if (!member.permissions.has(PermissionFlagsBits.KickMembers))
      return interaction.editReply({ content: 'Only staff members may close mod tickets.' });

    await interaction.message.edit({
      content: interaction.message.content,
      components: []
    });

    await channel.send('This ticket has been closed by staff.');

    await interaction.editReply({ content: 'Ticket closed.' });

    channel.edit({
      archived: true,
      locked: true
    });
  }
};