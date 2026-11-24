import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, DiscordAPIError, GuildTextBasedChannel, InteractionContextType, PermissionFlagsBits, RateLimitError, RESTJSONErrorCodes, SlashCommandBuilder } from 'discord.js';
import { Database } from '../shared/Database';
import { deferInteraction, msToHuman, SetSeverity } from '../utils';

export default {
  name: 'rename',
  data: new SlashCommandBuilder()
    .setName('rename')
    .setDescription('Rename the general channel.')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(option =>
      option
        .setName('new-name')
        .setDescription('The new name of the general channel.')
        .setRequired(true)
        .setMaxLength(100)
    ),

  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild()) return;
    await deferInteraction(interaction);

    try {
      const settings = await Database.getOrCreateSettings(interaction.guildId);
      if (!settings.general_chat_id) {
        await interaction.editReply({
          embeds: [{
            ...SetSeverity('warning'),
            description: 'No general channel has been configured.',
          }],
        });

        return;
      }

      const channel = await client.channels.fetch(settings.general_chat_id) as GuildTextBasedChannel;
      await channel.setName(interaction.options.getString('new-name', true), `${interaction.user.username} (${interaction.user.id}) ran '/rename'.`);

      await interaction.editReply({
        embeds: [{
          ...SetSeverity('success'),
          description: `Done! I've updated the general channel name to: **${channel.name}**.`,
        }],
      });
    } catch (error: Error | any) {
      let message = error?.message ?? 'An unexpected error occurred.';

      if (error instanceof RateLimitError)
        message = `The channel name update has been ratelimited. It will be reset in: ${msToHuman(error.retryAfter)}`;

      if (error instanceof DiscordAPIError) {
        switch (error.code) {
          case RESTJSONErrorCodes.MissingAccess:
            message = "I cannot see the channel you're trying to rename.";
            break;

          case RESTJSONErrorCodes.MissingPermissions:
            message = "I don't have permission to change the channel name.";
            break;

          case RESTJSONErrorCodes.UnknownChannel:
            message = 'I was unable to fetch the configured channel.';
            break;
        }
      }

      await interaction.editReply({
        embeds: [{
          ...SetSeverity('error'),
          description: message,
        }],
      });
    }
  }
};