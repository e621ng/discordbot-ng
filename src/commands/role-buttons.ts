import { ActionRowBuilder, ApplicationIntegrationType, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Client, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Database } from '../shared/Database';

export default {
  name: 'role-buttons',
  data: new SlashCommandBuilder()
    .setName('role-buttons')
    .setDescription('Manage role buttons.')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a role button')
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('The role to give')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('button-text')
            .setDescription('The button text')
            .setMaxLength(80)
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('message-text')
            .setDescription('The message text')
            .setRequired(true)
        )
    ),
  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Command must be ran in a guild.' });

    const subcommand = interaction.options.getSubcommand();
    if (subcommand == 'create') {
      if (!interaction.channel || !interaction.channel.isSendable())
        return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Missing permissions to send to channel.' });

      const bot = await interaction.guild.members.fetchMe();

      const role = interaction.options.getRole('role', true);
      const label = interaction.options.getString('button-text', true);
      const content = interaction.options.getString('message-text', true);

      if (role.position > bot.roles.highest.position)
        return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Role is higher than my highest role.' });

      const button = new ButtonBuilder()
        .setCustomId('role-button')
        .setStyle(ButtonStyle.Primary)
        .setLabel(label);

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(button);

      const message = await interaction.channel.send({ components: [row], content });
      await Database.putRoleButton(message.id, role.id);
      interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Created role button.' });
    }
  }
};