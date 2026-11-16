import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command } from '../types';
import { getRecordMessageFromDiscordId } from '../utils';

class RecordsCommand implements Command<Client<boolean>> {
  data = new SlashCommandBuilder()
    .setName('records')
    .setDescription("Get a user's on-site records.")
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The discord user to find the e621 user of.')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('id')
        .setDescription('The discord user id to find the e621 user of.')
        .setRequired(false)
    );

  async handleCommand(context: Client<boolean>, interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inGuild()) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const guild = await context.guilds.fetch(interaction.guildId);
      const user = interaction.options.getUser('user');
      const id = interaction.options.getString('id');

      if (!user && !id) throw new Error('No username or id was specified.');
      const idToUse = (user?.id ?? id) as string;

      const recordMessage = await getRecordMessageFromDiscordId(idToUse, 1, guild);
      if (!recordMessage) throw new Error('No records found on any linked accounts.');

      await interaction.editReply(recordMessage);
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }
}

export default new RecordsCommand();
