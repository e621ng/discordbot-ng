import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Database } from '../shared/Database';
import { SetSeverity } from '../utils';

async function handleHoneypotEnable(context: Client, interaction: ChatInputCommandInteraction) {
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

  await Database.updateSettings(interaction.guildId!, 'honeypot_channel_id', interaction.channelId);

  await interaction.editReply({
    embeds: [{
      ...SetSeverity('success'),
      description: 'Done! The honeypot channel is now configured and active.',
    }],
  });
}

async function handleHoneypotDisable(context: Client, interaction: ChatInputCommandInteraction) {
  const settings = await Database.getOrCreateSettings(interaction.guildId!);
  if (settings.honeypot_channel_id) await Database.updateSettings(interaction.guildId!, 'honeypot_channel_id', null);

  await interaction.editReply({
    embeds: [{
      ...SetSeverity('success'),
      description: 'Honeypot has been disabled. Use `/honeypot enable` to re-enable it.',
    }],
  });
}

export default {
  name: 'honeypot',

  data: new SlashCommandBuilder()
    .setName('honeypot')
    .setDescription('Setup a honeypot channel to catch bad bois >:(')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(builder => builder
      .setName('enable')
      .setDescription('Setup a honeypot channel.')
      .addStringOption(option => option
        .setName('message')
        .setDescription('The message to attach to the channel.')
        .setRequired(true)
        .setMaxLength(4096)
      )
    )
    .addSubcommand(builder => builder
      .setName('disable')
      .setDescription('Clear the honeypot configuration.')
    ),

  handler: async function (context: Client, interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild()) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const subcommand = interaction.options.getSubcommand(true);
      switch (subcommand) {
        case 'enable': return await handleHoneypotEnable(context, interaction);
        case 'disable': return await handleHoneypotDisable(context, interaction);
      }
    } catch (error: Error | any) {
      await interaction.editReply({ embeds: [{ ...SetSeverity('error'), description: error.message }] });
    }
  }
};
