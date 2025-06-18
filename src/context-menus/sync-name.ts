import { ApplicationIntegrationType, Client, InteractionContextType, PermissionFlagsBits, ContextMenuCommandBuilder, ApplicationCommandType, UserContextMenuCommandInteraction, GuildBasedChannel, MessageFlags, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { channelIsInStaffCategory, deferInteraction, getRecordMessageFromDiscordId, handleWhoIsInteraction, syncName } from '../utils';
import { Database } from '../shared/Database';
import { config } from '../config';

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

    const member = await interaction.guild?.members.fetch(idToUse);

    if (!member) {
      return interaction.reply('An error has occurred. Please try again later.');
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

    const guild = await interaction.client.guilds.fetch(config.DISCORD_GUILD_ID!);

    if (!guild) {
      return interaction.editReply('An error has occurred. Please try again later.');
    }

    if (!guild.members.me) {
      return interaction.editReply('An error has occurred. Please try again later.');
    }

    await syncName(interaction, member, null);
  }
};