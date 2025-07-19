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
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
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
    .addChannelOption(option =>
      option
        .setName('new-member-channel')
        .setDescription('Set the new member logs channel.')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option
        .setName('moderator-channel')
        .setDescription('Set the site moderator channel.')
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
    .addRoleOption(option =>
      option
        .setName('devwatch-role')
        .setDescription('Set the DevWatch role.')
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
    )
    .addChannelOption(option =>
      option
        .setName('add-safe-channel')
        .setDescription('Add a SFW channel.')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option
        .setName('remove-safe-channel')
        .setDescription('Remove a SFW channel.')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option
        .setName('add-link-skip-channel')
        .setDescription('Add a link skip channel.')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option
        .setName('remove-link-skip-channel')
        .setDescription('Remove a link skip channel.')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option
        .setName('github-release-channel')
        .setDescription('Set the github release channel.')
        .setRequired(false)
    ),
  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    let response = '';

    const settings = await Database.getGuildSettings(interaction.guildId!);

    if (!settings) {
      await Database.putGuild(interaction.guildId!);
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

    const newMemberLogsChannel = interaction.options.getChannel('new-member-channel');

    if (newMemberLogsChannel) {
      await Database.setGuildNewMemberLogsChannel(interaction.guildId!, newMemberLogsChannel.id);

      response += `New member logs channel set to ${newMemberLogsChannel}.\n`;
    }

    const moderatorChannel = interaction.options.getChannel('moderator-channel');

    if (moderatorChannel) {
      await Database.setGuildModeratorChannel(interaction.guildId!, moderatorChannel.id);

      response += `Moderator channel set to ${moderatorChannel}.\n`;
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

    const devWatchRole = interaction.options.getRole('devwatch-role');

    if (devWatchRole) {
      await Database.setGuildDevWatchRole(interaction.guildId!, devWatchRole.id);

      response += `DevWatch role set to ${devWatchRole}.\n`;
    }

    const addCategory = interaction.options.getChannel('add-staff-category');
    if (addCategory) {
      if (addCategory.type == ChannelType.GuildCategory) {
        await Database.putGuildArraySetting('staff_categories', interaction.guildId!, addCategory.id);

        response += `Added ${addCategory.toString()} as a staff category.\n`;
      } else {
        response += `Error adding staff category: ${addCategory.toString()} isn't a category.`;
      }
    }

    const removeCategory = interaction.options.getChannel('remove-staff-category');
    if (removeCategory) {
      if (removeCategory.type == ChannelType.GuildCategory) {
        if (await Database.removeGuildArraySetting('staff_categories', interaction.guildId!, removeCategory.id)) {
          response += `Removed ${removeCategory.toString()} as a staff category\n`;
        } else {
          response += `Error removing staff category: ${removeCategory.toString()} isn't a staff category.`;
        }
      } else {
        response += `Error removing staff category: ${removeCategory.toString()} isn't a category.`;
      }
    }

    const addSafeChannel = interaction.options.getChannel('add-safe-channel');
    if (addSafeChannel) {
      if (addSafeChannel.type == ChannelType.GuildText) {
        await Database.putGuildArraySetting('safe_channels', interaction.guildId!, addSafeChannel.id);

        response += `Added ${addSafeChannel.toString()} as a SFW cannel.\n`;
      } else {
        response += `Error adding SFW channel: ${addSafeChannel.toString()} isn't a text channel.`;
      }
    }

    const removeSafeChannel = interaction.options.getChannel('remove-safe-channel');
    if (removeSafeChannel) {
      if (removeSafeChannel.type == ChannelType.GuildText) {
        if (await Database.removeGuildArraySetting('safe_channels', interaction.guildId!, removeSafeChannel.id)) {
          response += `Removed ${removeSafeChannel.toString()} as a safe channel\n`;
        } else {
          response += `Error removing safe channel: ${removeSafeChannel.toString()} isn't a safe channel.`;
        }
      } else {
        response += `Error removing safe channel: ${removeSafeChannel.toString()} isn't a text channel.`;
      }
    }

    const addLinkSkipChannel = interaction.options.getChannel('add-link-skip-channel');
    if (addLinkSkipChannel) {
      if (addLinkSkipChannel.type == ChannelType.GuildText) {
        await Database.putGuildArraySetting('link_skip_channels', interaction.guildId!, addLinkSkipChannel.id);

        response += `Added ${addLinkSkipChannel.toString()} as a link skip channel.\n`;
      } else {
        response += `Error adding link skip channel: ${addLinkSkipChannel.toString()} isn't a text channel.`;
      }
    }

    const removeLinkSkipChannel = interaction.options.getChannel('remove-link-skip-channel');
    if (removeLinkSkipChannel) {
      if (removeLinkSkipChannel.type == ChannelType.GuildText) {
        if (await Database.removeGuildArraySetting('link_skip_channels', interaction.guildId!, removeLinkSkipChannel.id)) {
          response += `Removed ${removeLinkSkipChannel.toString()} as a staff category\n`;
        } else {
          response += `Error removing link skip channel: ${removeLinkSkipChannel.toString()} isn't a link skip channel.`;
        }
      } else {
        response += `Error removing link skip channel: ${removeLinkSkipChannel.toString()} isn't a text channel.`;
      }
    }

    const githubReleaseChannel = interaction.options.getChannel('github-release-channel');

    if (githubReleaseChannel) {
      await Database.setGuildGithubReleaseChannel(interaction.guildId!, githubReleaseChannel.id);

      response += `Github releases channel set to ${githubReleaseChannel}.\n`;
    }

    if (response.length == 0) return interaction.editReply({ content: 'No settings provided.' });

    interaction.editReply({ content: response });
  }
};