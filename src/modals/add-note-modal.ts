import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Client, GuildTextBasedChannel, MessageFlags, ModalSubmitInteraction, TextChannel, ThreadAutoArchiveDuration } from 'discord.js';
import { ticketCooldownMap } from '../shared/ticket-cooldown';
import { Database } from '../shared/Database';

export default {
  name: 'add-note-modal',
  handler: async function (client: Client, interaction: ModalSubmitInteraction, id: string) {
    const message = interaction.fields.getTextInputValue('note-message');

    await Database.putNote(id, message, interaction.user.id);

    interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Note added' });
  }
};