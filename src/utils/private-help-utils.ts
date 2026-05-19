import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ChatInputCommandInteraction, Client, Guild, GuildMember, LabelBuilder, ModalBuilder, PrivateThreadChannel, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextChannel, TextInputBuilder, TextInputStyle, ThreadAutoArchiveDuration, ThreadChannel, UserContextMenuCommandInteraction } from 'discord.js';
import { Database } from '../shared/Database';

export async function closeOldTickets(client: Client) {
  for (const ticket of await Database.getAllOpenPrivateHelpTickets()) {
    try {
      const thread = await client.channels.fetch(ticket.thread_id) as ThreadChannel;
      const latestMessage = (await thread.messages.fetch({ limit: 1 })).at(0);
      if (latestMessage && latestMessage.createdTimestamp <= Date.now() - 432e6) {
        await Database.closePrivateHelpTicket(thread.id);

        await thread.send('This ticket has been closed due to inactivity.');

        thread.edit({
          archived: true,
          locked: true
        });
      }
    } catch (e) {
      console.error('Error closing ticket due to inactivity:');
      console.error(e);
    }
  }
}

export async function createPrivateHelpTicketThread(client: Client, guild: Guild, creator: GuildMember | null, reason: string, customTitle: string = '', additionalMembersToAdd: string[] = []): Promise<PrivateThreadChannel | null> {
  const guildSettings = await Database.getGuildSettings(guild.id);

  if (!guildSettings || !guildSettings.private_help_channel_id || !guildSettings.private_help_role_id) return null;

  const channel = await client.channels.fetch(guildSettings.private_help_channel_id) as TextChannel;

  const thread = await channel.threads.create({
    name: customTitle ? customTitle : (creator ? `${creator.displayName}'s Ticket` : 'Mod Ticket'),
    autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
    invitable: false,
    type: ChannelType.PrivateThread
  }) as PrivateThreadChannel;

  if (creator) await Database.createPrivateHelpTicket(creator.id, thread.id);

  if (creator) {
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
      content: `${creator} feel free to direct your questions at any <@&${guildSettings.private_help_role_id}>. Only you and staff members can see this channel.\n\n**Reason for contact:**\n${reason}\n\n-# Tickets will automatically close after 5 days of inactivity.`,
      components: [row],
      allowedMentions: {
        users: [creator.id],
        roles: [guildSettings.private_help_role_id]
      }
    });
  } else {
    const closeButton = new ButtonBuilder()
      .setCustomId('close-mod-ticket')
      .setLabel('Close Mod Ticket')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(closeButton);

    await thread.send({
      content: reason,
      components: [row],
      allowedMentions: {
        users: Array.from(new Set(additionalMembersToAdd))
      }
    });
  }

  for (const id of additionalMembersToAdd) {
    await thread.members.add(id);
  }

  return thread;
}

export async function openModTicketModal(interaction: UserContextMenuCommandInteraction | ChatInputCommandInteraction, member: GuildMember) {
  const modal = new ModalBuilder()
    .setCustomId(`open-mod-ticket_${member.id}`)
    .setTitle(`Opening A Mod Ticket With ${member.displayName}`);

  const titleInput = new TextInputBuilder()
    .setCustomId('title')
    .setMaxLength(100)
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const titleLabel = new LabelBuilder()
    .setLabel('Title')
    .setDescription(`The name of the thread. Defaults to "Mod Ticket For ${member.displayName}" if left empty`)
    .setTextInputComponent(titleInput);

  const initialMessageInput = new TextInputBuilder()
    .setCustomId('initial-message')
    .setMaxLength(1800)
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  const initialMessageLabel = new LabelBuilder()
    .setLabel('Inital Message')
    .setDescription('The inital message sent in the thread')
    .setTextInputComponent(initialMessageInput);

  const yesNoMenu = new StringSelectMenuBuilder()
    .setCustomId('auto-join-thread')
    .setRequired(false)
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Yes')
        .setDefault(true)
        .setValue('yes'),
      new StringSelectMenuOptionBuilder()
        .setLabel('No')
        .setDefault(false)
        .setValue('no')
    );

  const autoJoinLabel = new LabelBuilder()
    .setLabel('Auto Join Thread')
    .setDescription('Whether or not to join you to the thread. Selecting no will not notify you of messages sent!')
    .setStringSelectMenuComponent(yesNoMenu);

  modal.addLabelComponents(titleLabel, initialMessageLabel, autoJoinLabel);

  interaction.showModal(modal);
}