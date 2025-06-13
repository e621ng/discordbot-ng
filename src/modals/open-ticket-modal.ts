import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Client, GuildTextBasedChannel, MessageFlags, ModalSubmitInteraction, TextChannel, ThreadAutoArchiveDuration } from 'discord.js';
import { ticketCooldownMap } from '../shared/ticket-cooldown';
import { Database } from '../shared/Database';

export default {
  name: 'open-ticket-modal',
  handler: async function (client: Client, interaction: ModalSubmitInteraction) {
    const guild = await client.guilds.fetch(interaction.guildId!);
    const member = await guild.members.fetch(interaction.user.id);

    const guildSettings = await Database.getGuildSettings(guild.id);

    if (!guildSettings || !guildSettings.private_help_role_id)
      return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Failed to create ticket. Please report this to a staff member.' });

    ticketCooldownMap.set(interaction.user.id, Date.now() + 8.64e+7);

    const reason = interaction.fields.getTextInputValue('ticket-message');

    const channel = (await interaction.channel?.fetch()) as TextChannel;

    const thread = await channel.threads.create({
      name: `${member.displayName}'s Ticket`,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
      invitable: false,
      type: ChannelType.PrivateThread
    });

    const closeButton = new ButtonBuilder()
      .setCustomId('close-ticket')
      .setLabel('Click here if you no longer need help')
      .setStyle(ButtonStyle.Danger);

    const claimButton = new ButtonBuilder()
      .setCustomId('claim-ticket')
      .setLabel('Claim ticket')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(closeButton, claimButton);

    await thread.send({
      content: `${interaction.user} feel free to direct your questions at any <@&${guildSettings.private_help_role_id}>. Only you and staff members can see this channel.\n\n**Reason for contact:**\n${reason}`,
      components: [row],
      allowedMentions: {
        users: [interaction.user.id],
        roles: [guildSettings.private_help_role_id]
      }
    });

    interaction.reply({ flags: [MessageFlags.Ephemeral], content: `Your ticket has been created: ${thread}` });
  }
};