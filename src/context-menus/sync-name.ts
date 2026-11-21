import { ApplicationCommandType, ApplicationIntegrationType, Client, ContextMenuCommandBuilder, DiscordAPIError, InteractionContextType, MessageFlags, ModalBuilder, PermissionFlagsBits, RESTJSONErrorCodes, TextInputStyle, UserContextMenuCommandInteraction } from 'discord.js';
import { config } from '../config';
import { Database } from '../shared/Database';
import { createTextInput, deferInteraction, SetSeverity, syncName } from '../utils';

export default {
  name: 'Sync Name',
  data: new ContextMenuCommandBuilder()
    .setName('Sync Name')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .setType(ApplicationCommandType.User),
  handler: async function (client: Client, interaction: UserContextMenuCommandInteraction) {
    try {
      const guild = await client.guilds.fetch(config.DISCORD_GUILD_ID!);
      const [member, moderator] = await Promise.all([
        guild.members.fetch(interaction.targetId),
        guild.members.fetch(interaction.user.id),
      ]);

      if (moderator.roles.highest.comparePositionTo(member.roles.highest) <= 0) throw new Error("You do not have permission to sync this user's nickname.");

      const availableIds = await Database.getE621Ids(interaction.targetId);
      if (availableIds.length > 1) {
        const modal = new ModalBuilder()
          .setCustomId(`sync-name-modal_${interaction.targetId}`)
          .setTitle(`Syncing ${member.user.username.slice(0, 20)}'s nickname.`);

        const inputLabel = createTextInput('id', 'Multiple linked accounts. Specify an ID.', null, false, TextInputStyle.Short, null, null);
        modal.addLabelComponents(inputLabel);

        await interaction.showModal(modal);
        return;
      }

      await deferInteraction(interaction);
      await syncName(interaction, interaction.targetId, null);
    } catch (error: Error | any) {
      let message = error?.message ?? 'An unexpected error occurred.';

      if (error instanceof DiscordAPIError) {
        switch (error.code) {
          case RESTJSONErrorCodes.UnknownGuild:
            message = 'I was unable to fetch the server.';
            break;

          case RESTJSONErrorCodes.UnknownMember:
            message = `I was unable to fetch <@${interaction.targetId}> as a server member.`;
            break;
        }
      }

      if (interaction.deferred)
        await interaction.editReply({ embeds: [{ ...SetSeverity('error'), description: message }] });
      else
        await interaction.reply({ embeds: [{ ...SetSeverity('error'), description: message }], flags: MessageFlags.Ephemeral });
    }
  }
};