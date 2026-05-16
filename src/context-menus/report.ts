import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  Client,
  ContextMenuCommandBuilder,
  GuildTextBasedChannel,
  InteractionContextType,
  MessageContextMenuCommandInteraction,
  MessageFlags
} from "discord.js";

import { Database } from "../shared/Database";

const cooldowns = new Map<string, number>();
const COOLDOWN_TIME = 300000; // 5 minutes

export default {
  name: 'Report Message',

  data: new ContextMenuCommandBuilder()
    .setName('Report Message')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setType(ApplicationCommandType.Message),

  handler: async function (
    client: Client,
    interaction: MessageContextMenuCommandInteraction
  ) {
    try {
      const userId = interaction.user.id;
      const now = Date.now();

      const cooldownExpiration = cooldowns.get(userId);
      if (cooldownExpiration && now < cooldownExpiration) {
        const expiresAt = Math.floor(cooldownExpiration / 1000);
        return interaction.reply({
          embeds: [{
            color: 0xffaa00,
            description: `Slow down there, you can report another message <t:${expiresAt}:R>.`
          }],
          flags: [MessageFlags.Ephemeral]
        });
      }

      // Set cooldown
      cooldowns.set(userId, now + COOLDOWN_TIME);

      // Optional cleanup
      setTimeout(() => {
        cooldowns.delete(userId);
      }, COOLDOWN_TIME);

      const guildSettings = await Database.getGuildSettings(interaction.guildId!);

      const reportsChannel =
        await client.channels.fetch(
          guildSettings?.moderator_channel_id!
        ) as GuildTextBasedChannel;

      await reportsChannel.send({
        embeds: [{
          title: 'New Message Report!',
          fields: [
            {
              name: 'Message',
              value: interaction.targetMessage.url,
              inline: false
            },
            {
              name: 'Author',
              value: interaction.targetMessage.author.toString(),
              inline: false
            },
            {
              name: 'Reporter',
              value: interaction.user.toString(),
              inline: false
            }
          ]
        }]
      });

      await interaction.reply({
        embeds: [{
          color: 0x014995,
          description:
            "Thanks for making a report! I've notified the moderators who can take further action."
        }],
        flags: [MessageFlags.Ephemeral]
      });

    } catch (error) {
      console.error(error);
      if (!interaction.replied) {
        await interaction.reply({
          embeds: [{
            color: 0xff5555,
            description:
              "Hmm, an error occurred while processing your request. If you receive this error more than once, DM a moderator for further assistance."
          }],
          flags: [MessageFlags.Ephemeral]
        });
      }
    }
  }
};