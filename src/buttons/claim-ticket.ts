import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChannelType, Client, MessageFlags } from 'discord.js';
import { Database } from '../shared/Database';
import { Button } from '../types';

class ClaimTicketButton implements Button<Client> {
  id = 'claim-ticket';

  async execute(context: Client<boolean>, interaction: ButtonInteraction, ...args: any[]): Promise<void> {
    if (!interaction.inGuild()) return;

    try {
      const channel = await context.channels.fetch(interaction.channelId);
  
      if (!channel) throw new Error("The interaction channel couldn't be fetched.");
      if (!channel.isThread() || channel.type != ChannelType.PrivateThread) throw new Error('This interaction was not run in a ticket thread.');
      if (!channel.isSendable()) throw new Error("I don't have permission to send messages in this channel.");

      const settings = await Database.getOrCreateSettings(interaction.guildId);
      if (!settings.private_help_role_id) throw new Error("\`private_help_role_id\` hasn't been configured. Please report this error to staff.");
      if (!(interaction.member.roles as string[]).includes(settings.private_help_role_id)) throw new Error("You don't have permission to claim tickets.");

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
    } catch (error: Error | any) {
      await interaction.reply({
        content: error.message,
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});

      return;
    }
  }
}

export default new ClaimTicketButton();