import { ActionRowBuilder, ApplicationIntegrationType, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Client, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Database } from '../shared/Database';
import { SetSeverity } from '../utils';

export default {
  name: 'private-help',
  data: new SlashCommandBuilder()
    .setName('private-help')
    .setDescription('Setup a private help button.')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(option =>
      option
        .setName('content')
        .setDescription('The content of the associated message.')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('button-label')
        .setDescription('The label of the button.')
        .setRequired(false)
    ),

  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild()) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      if (!interaction.channel || !interaction.channel.isSendable()) {
        await interaction.editReply({
          embeds: [{
            ...SetSeverity('warning'),
            description: "I don't have permission to see this channel.",
          }],
        });

        return;
      }

      const content = interaction.options.getString('content', true);
      const label = interaction.options.getString('button-label') ?? 'Get in contact';

      const button = new ButtonBuilder()
        .setCustomId('private-help')
        .setStyle(ButtonStyle.Primary)
        .setLabel(label);

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(button);

      await interaction.channel.send({
        components: [row],

        embeds: [{
          ...SetSeverity('info'),
          description: content,
        }],
      });

      await Database.updateSettings(interaction.guildId, 'private_help_channel_id', interaction.channelId);

      await interaction.editReply({
        embeds: [{
          ...SetSeverity('success'),
          description: 'Private Help has been configured successfully. New tickets will be created in this channel.',
        }],
      });
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }

  }
};
