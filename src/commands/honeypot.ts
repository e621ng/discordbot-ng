import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Database } from '../shared/Database';
import { SetSeverity } from '../utils';

export default {
  name: 'honeypot',

  data: new SlashCommandBuilder()
    .setName('honeypot')
    .setDescription('Setup a honeypot channel to catch bad bois >:(')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(option => option
      .setName('message')
      .setDescription('The message to attach to the channel.')
      .setRequired(true)
    ),

  handler: async function (context: Client, interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild()) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!interaction.channel || !interaction.channel.isSendable()) {
      await interaction.editReply({
        embeds: [{
          ...SetSeverity('warning'),
          description: "I don't have permissions to send messages in this channel.",
        }],
      });

      return;
    }

    const message = interaction.options.getString('message') ?? '';
    await interaction.channel.send({
      embeds: [{
        ...SetSeverity('warning'),
        description: message
      }],
    });

    await Database.updateSettings(interaction.guildId, 'honeypot_channel_id', interaction.channelId);

    await interaction.editReply({
      embeds: [{
        ...SetSeverity('success'),
        description: 'Done! The honeypot channel is now configured and active.',
      }],
    });
  }
};
