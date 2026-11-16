import { ActionRowBuilder, ApplicationIntegrationType, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Client, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Database } from '../shared/Database';
import { Command } from '../types';
import { SetSeverity } from '../utils';

class PrivateHelpCommand implements Command<Client<boolean>> {
  data = new SlashCommandBuilder()
    .setName('private-help')
    .setDescription('Setup a private help button.')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(option =>
      option
        .setName('content')
        .setDescription('The content of the message.')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('button-label')
        .setDescription('The button label.')
        .setRequired(false)
    );

  async handleCommand(context: Client<boolean>, interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inGuild()) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      if (!interaction.channel || !interaction.channel.isSendable()) throw new Error("I don't have permissions to send messages in this channel.");

      const content = interaction.options.getString('content') ?? '';
      const label = interaction.options.getString('button-label') ?? 'Get in contact';

      const button = new ButtonBuilder()
        .setCustomId('private-help')
        .setStyle(ButtonStyle.Primary)
        .setLabel(label);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
      await interaction.channel.send({
        components: [row],
        embeds: [{
          color: 0x014995,
          description: content,
        }],
      });

      await Database.updateSettings(interaction.guildId, 'private_help_channel_id', interaction.channelId);
      await interaction.editReply({
        embeds: [{
          ...SetSeverity('success'),
          description: 'Done!',
        }],
      });
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }
}

export default new PrivateHelpCommand();
