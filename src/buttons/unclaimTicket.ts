import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChannelType, Client, MessageFlags } from 'discord.js';
import { Database } from '../shared/Database';
import { Button } from '../types';

class UnclaimTicketButton implements Button<Client> {
  id = 'unclaim-ticket';

  async execute(context: Client<boolean>, interaction: ButtonInteraction): Promise<void> {
    if (!interaction.inGuild()) return;
    await interaction.deferReply();

    try {
      const channel = await context.channels.fetch(interaction.channelId);

      if (!channel) throw new Error("The interaction channel couldn't be fetched.");
      if (!channel.isThread() || channel.type != ChannelType.PrivateThread) throw new Error('This interaction was not run in a ticket thread.');
      if (!channel.isSendable()) throw new Error("I don't have permission to send messages in this channel.");

      const settings = await Database.getOrCreateSettings(interaction.guildId);
      if (!settings.private_help_role_id) throw new Error("\`private_help_role_id\` hasn't been configured. Please report this error to staff.");

      const guild = await context.guilds.fetch(interaction.guildId);
      const member = await guild.members.fetch(interaction.user.id);
      if (!member.roles.cache.has(settings.private_help_role_id)) throw new Error("You don't have permission to claim tickets.");

      if (!interaction.message.content.split('\n').at(-1)!.includes(`<@${interaction.user.id}>`)) throw new Error(`You haven't claimed this ticket.`);

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

      await interaction.editReply({ content: 'Ticket unclaimed.' });
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }
}

export default new UnclaimTicketButton();