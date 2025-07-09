import { ActionRowBuilder, ApplicationIntegrationType, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Client, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

export default {
  name: 'devwatch',
  data: new SlashCommandBuilder()
    .setName('devwatch')
    .setDescription('Sends a dev watch role toggle button.')
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
    ),
  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    if (!interaction.channel || !interaction.channel.isSendable())
      return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Missing permissions to send to channel.' });

    const content = interaction.options.getString('content') ?? '';
    const label = interaction.options.getString('button-label') ?? 'Toggle DevWatch Role';

    const button = new ButtonBuilder()
      .setCustomId('dev-watch')
      .setStyle(ButtonStyle.Primary)
      .setLabel(label);

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(button);

    await interaction.channel.send({ components: [row], content });

    interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Sent.' });
  }
};