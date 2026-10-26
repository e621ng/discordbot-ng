import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChannelType, Client, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { Button } from '../types';
import { SetSeverity } from '../utils';

class ClaimTicketButton implements Button<Client> {
  id = 'claim-ticket';

  async execute(context: Client<boolean>, interaction: ButtonInteraction): Promise<void> {
    if (!interaction.inGuild()) return;
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    try {
      const channel = await context.channels.fetch(interaction.channelId);

      if (!channel) throw new Error("The interaction channel couldn't be fetched.");
      if (!channel.isThread() || channel.type != ChannelType.PrivateThread) throw new Error('This interaction was not run in a ticket thread.');
      if (!channel.isSendable()) throw new Error("I don't have permission to send messages in this channel.");

      if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages)) throw new Error("You don't have permission to unclaim tickets.");

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

      await channel.send({
        embeds: [{
          ...SetSeverity('success'),
          description: `This ticket was claimed by ${interaction.user}.`
        }]
      });

      await interaction.editReply({ content: "You've claimed this ticket." });
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }
}

export default new ClaimTicketButton();
