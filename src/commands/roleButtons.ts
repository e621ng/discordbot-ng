import { ActionRowBuilder, ApplicationIntegrationType, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Client, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Database } from '../shared/Database';
import { Command } from '../types';
import { SetSeverity } from '../utils';

async function handleRoleButtonsCreate(context: Client<boolean>, interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const guild = await context.guilds.fetch(interaction.guildId);

  if (!interaction.channel || !interaction.channel.isSendable()) throw new Error("I don't have permissions to send messages in this channel.");

  const bot = await guild.members.fetchMe();

  const role = interaction.options.getRole('role', true);
  const label = interaction.options.getString('button-text', true);
  const content = interaction.options.getString('message-text', true);

  if (role.position > bot.roles.highest.position) throw new Error('I cannot assign a role above my highest role.');

  const button = new ButtonBuilder()
    .setCustomId('role-button')
    .setStyle(ButtonStyle.Primary)
    .setLabel(label);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
  const message = await interaction.channel.send({
    components: [row],
    embeds: [{
      color: 0x014995,
      description: content,
    }],
  });

  await Database.putRoleButton(message.id, role.id);

  await interaction.editReply({
    embeds: [{
      ...SetSeverity('success'),
      description: `A button has been created for <@&${role.id}>.`,
    }],
  });
}

class RoleButtonsCommand implements Command<Client<boolean>> {
  data = new SlashCommandBuilder()
    .setName('role-buttons')
    .setDescription('Manage role buttons.')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
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
    );

  async handleCommand(context: Client<boolean>, interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inGuild()) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      switch (interaction.options.getSubcommand()) {
        case 'create': return await handleRoleButtonsCreate(context, interaction);
      }
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }
}

export default new RoleButtonsCommand();
