import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Database } from '../shared/Database';
import { Command } from '../types';
import { deferInteraction, getIdFromInput, SetSeverity } from '../utils';

class DatabaseCommand implements Command<Client<boolean>> {
  data = new SlashCommandBuilder()
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
                .setRequired(true)
            )
        )
    );

  async handleCommand(context: Client<boolean>, interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inGuild()) return;
    await deferInteraction(interaction);

    try {
      const group = interaction.options.getSubcommandGroup(true);
      const subcommand = interaction.options.getSubcommand(true);

      switch (`${group}:${subcommand}`) {
        case 'messages:purge': return await handleMessagesPurge(context, interaction);
      }
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }
}

async function handleMessagesPurge(context: Client<boolean>, interaction: ChatInputCommandInteraction): Promise<void> {
  const userId = getIdFromInput(interaction.options.getString('user', true));
  await Database.purgeMessagesFrom(userId);

  await interaction.editReply({
    embeds: [{
      ...SetSeverity('success'),
      description: `Messages for <@${userId}> have been purged.`,
    }],
  });

  return;
}

export default new DatabaseCommand();
