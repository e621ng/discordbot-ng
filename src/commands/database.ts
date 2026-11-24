import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Database } from '../shared/Database';
import { deferInteraction, getIdFromInput, SetSeverity } from '../utils';

async function handleMessagesPurge(client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
  const idToUse = getIdFromInput(interaction.options.getString('user', true));
  const result = await Database.purgeMessagesFrom(idToUse);
  if (result == 0) {
    await interaction.editReply({
      embeds: [{
        ...SetSeverity('warning'),
        description: 'The operation was completed but no rows have been affected.'
      }],
    });

    return;
  }

  await interaction.editReply({
    embeds: [{
      ...SetSeverity('success'),
      description: `Successfully purged ${result} messages for <@${idToUse}>.`,
    }],
  });
}

export default {
  name: 'database',
  data: new SlashCommandBuilder()
    .setName('database')
    .setDescription('Database access.')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommandGroup(subcommandGroup =>
      subcommandGroup
        .setName('messages')
        .setDescription('Access to messages in the database.')
        .addSubcommand(subcommand =>
          subcommand
            .setName('purge')
            .setDescription("Purge a user's messages from the database.")
            .addStringOption(option =>
              option
                .setName('user')
                .setDescription('The discord user id, or mention, of the user.')
                .setRequired(true)))),

  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    await deferInteraction(interaction);

    const group = interaction.options.getSubcommandGroup(true);
    const subcommand = interaction.options.getSubcommand(true);

    switch (`${group}:${subcommand}`) {
      case 'messages:purge': return await handleMessagesPurge(client, interaction);
    }
  }
};
