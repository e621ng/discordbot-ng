import { ApplicationCommandType, ApplicationIntegrationType, Client, ContextMenuCommandBuilder, GuildTextBasedChannel, InteractionContextType, MessageContextMenuCommandInteraction, MessageFlags } from "discord.js";

// TODO: Later Nix's problem: Command Cooldown.

export default {
  name: 'Report Message',
  data: new ContextMenuCommandBuilder()
    .setName('Report Message')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setType(ApplicationCommandType.Message),
  
  handler: async function (client: Client, interaction: MessageContextMenuCommandInteraction) {
    try {
      const reportsChannel = await client.channels.fetch("1504936076081369150") as GuildTextBasedChannel;

      reportsChannel.send({
        embeds: [{
          title: 'New Message Report!',
          fields: [
            { name: 'Message', value: interaction.targetMessage.url, inline: false },
            { name: 'Author', value: interaction.targetMessage.author.toString(), inline: false },
            { name: 'Reporter', value: interaction.user.toString(), inline: false }
          ]
        }]
      });

      interaction.reply({
        embeds: [{
          color: 0x014995,
          description: "Thanks for making a report! Moderators have been notified and will investigate when they can next!"
        }],

        flags: [MessageFlags.Ephemeral]
      });
    } catch (error) {
      interaction.reply({
        embeds: [{
          color: 0xff5555,
          description: "Hmm, an error occured while processing your request. If you receive this error more than once, DM a moderator for assistance."
        }]
      })
    }
  }
}