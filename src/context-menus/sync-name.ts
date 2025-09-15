import { ActionRowBuilder, ApplicationCommandType, ApplicationIntegrationType, Client, ContextMenuCommandBuilder, InteractionContextType, ModalBuilder, PermissionFlagsBits, TextInputBuilder, TextInputStyle, UserContextMenuCommandInteraction } from 'discord.js';
import { config } from '../config';
import { Database } from '../shared/Database';
import { deferInteraction, syncName } from '../utils';

export default {
  name: 'Sync Name',
  data: new ContextMenuCommandBuilder()
    .setName('Sync Name')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .setType(ApplicationCommandType.User),
  handler: async function (client: Client, interaction: UserContextMenuCommandInteraction) {
    const availableIds = await Database.getE621Ids(interaction.user.id);

    const idToUse = interaction.targetUser.id;

    const guild = await interaction.client.guilds.fetch(config.DISCORD_GUILD_ID!);

    if (!guild) {
      return interaction.editReply('An error has occurred. Please try again later.');
    }

    const member = await guild.members.fetch(idToUse);

    const interactionMember = await guild.members.fetch(interaction.user.id);

    if (!member || !interactionMember) {
      return interaction.reply('An error has occurred. Please try again later.');
    }

    if (interactionMember.roles.highest.comparePositionTo(member.roles.highest) <= 0) {
      return await interaction.editReply("You do not have permission to sync this user's name.");
    }

    if (availableIds.length > 1) {
      const modal = new ModalBuilder()
        .setCustomId(`sync-name-modal_${idToUse}`)
        .setTitle(`Syncing ${member ? member.displayName : idToUse}'s name`);

      const input = new TextInputBuilder()
        .setCustomId('id')
        .setLabel('User has multiple linked accounts. Provide ID')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));

      return await interaction.showModal(modal);
    }

    await deferInteraction(interaction);

    if (!guild.members.me) {
      return interaction.editReply('An error has occurred. Please try again later.');
    }

    await syncName(interaction, member, null);
  }
};