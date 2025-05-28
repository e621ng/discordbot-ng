import { ApplicationIntegrationType, ChannelType, ChatInputCommandInteraction, Client, InteractionContextType, MessageFlags, PermissionFlagsBits, RateLimitError, SlashCommandBuilder } from 'discord.js';
import { msToHuman } from '../utils';
import { Database } from '../shared/Database';

export default {
  name: 'settings',
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Change server settings.')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
      option
        .setName('general-channel')
        .setDescription('Set the general channel.')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option
        .setName('tickets-channel')
        .setDescription('Set the ticket logs channel.')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option
        .setName('message-logs-channel')
        .setDescription('Set the message logs channel.')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option
        .setName('audit-logs-channel')
        .setDescription('Set the audit logs channel.')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option
        .setName('voice-logs-channel')
        .setDescription('Set the voice logs channel.')
        .setRequired(false)
    )
    .addRoleOption(option =>
      option
        .setName('admin-role')
        .setDescription('Set the admin role.')
        .setRequired(false)
    )
    .addRoleOption(option =>
      option
        .setName('private-helper-role')
        .setDescription('Set the private helper role.')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option
        .setName('add-staff-category')
        .setDescription('Add a category to staff categories.')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option
        .setName('remove-staff-category')
        .setDescription('Remove a category from staff categories.')
        .setRequired(false)
    ),
  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    let response = '';

    const settings = await Database.getGuildSettings(interaction.guildId!);

    if (!settings) {
      await Database.addGuild(interaction.guildId!);
    }

    const generalChannel = interaction.options.getChannel('general-channel');

    if (generalChannel) {
      await Database.setGuildGeneralChatId(interaction.guildId!, generalChannel.id);

      response += `General channel set to ${generalChannel}.\n`;
    }

    const ticketsChannel = interaction.options.getChannel('tickets-channel');

    if (ticketsChannel) {
      await Database.setGuildTicketsLogsChannelId(interaction.guildId!, ticketsChannel.id);

      response += `Tickets logs channel set to ${ticketsChannel}.\n`;
    }

    const messageLogsChannel = interaction.options.getChannel('message-logs-channel');

    if (messageLogsChannel) {
      await Database.setGuildEventsLogsChannelId(interaction.guildId!, messageLogsChannel.id);

      response += `Message logs channel set to ${messageLogsChannel}.\n`;
    }

    const auditLogsChannel = interaction.options.getChannel('audit-logs-channel');

    if (auditLogsChannel) {
      await Database.setGuildAuditLogsChannelId(interaction.guildId!, auditLogsChannel.id);

      response += `Audit logs channel set to ${auditLogsChannel}.\n`;
    }

    const voiceLogsChannel = interaction.options.getChannel('voice-logs-channel');

    if (voiceLogsChannel) {
      await Database.setGuildVoiceLogsChannelId(interaction.guildId!, voiceLogsChannel.id);

      response += `Voice logs channel set to ${voiceLogsChannel}.\n`;
    }

    const adminRole = interaction.options.getRole('admin-role');

    if (adminRole) {
      await Database.setGuildAdminRole(interaction.guildId!, adminRole.id);

      response += `Admin role set to ${adminRole}.\n`;
    }

    const privateHelperRole = interaction.options.getRole('private-helper-role');

    if (privateHelperRole) {
      await Database.setGuildPrivateHelperRole(interaction.guildId!, privateHelperRole.id);

      response += `Private helper role set to ${privateHelperRole}.\n`;
    }

    const addCategory = interaction.options.getChannel('add-staff-category');
    if (addCategory) {
      if (addCategory.type == ChannelType.GuildCategory) {
        await Database.addGuildStaffCategory(interaction.guildId!, addCategory.id);

        response += `Added ${addCategory.toString()} as a staff category.\n`;
      } else {
        response += `Error adding staff category: ${addCategory.toString()} isn't a category.`;
      }
    }

    const removeCategory = interaction.options.getChannel('remove-staff-category');
    if (removeCategory) {
      if (removeCategory.type == ChannelType.GuildCategory) {
        if (await Database.removeGuildStaffCategory(interaction.guildId!, removeCategory.id)) {
          response += `Removed ${removeCategory.toString()} as a staff category\n`;
        } else {
          response += `Error removing staff category: ${removeCategory.toString()} isn't a staff category.`;
        }
      } else {
        response += `Error removing staff category: ${removeCategory.toString()} isn't a category.`;
      }
    }

    if (response.length == 0) return interaction.reply({ content: 'No settings provided.', flags: [MessageFlags.Ephemeral] });

    interaction.reply({ content: response, flags: [MessageFlags.Ephemeral] });
  }
};