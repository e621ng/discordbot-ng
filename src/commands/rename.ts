import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, InteractionContextType, PermissionFlagsBits, RateLimitError, SlashCommandBuilder } from 'discord.js';
import { Database } from '../shared/Database';
import { Command } from '../types';
import { deferInteraction, msToHuman, SetSeverity } from '../utils';

class RenameCommand implements Command<Client<boolean>> {
  data = new SlashCommandBuilder()
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
    );

  async handleCommand(context: Client<boolean>, interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inGuild()) return;
    await deferInteraction(interaction);

    try {
      const guild = await context.guilds.fetch(interaction.guildId);

      const settings = await Database.getOrCreateSettings(interaction.guildId);
      if (!settings.general_chat_id) throw new Error('No general chat id found.');

      const name = interaction.options.getString('new-name', true);
      if (name.length > 100) throw new Error('The channel name must be less than 100 characters in length.');

      const channel = await guild.channels.fetch(settings.general_chat_id);
      if (!channel) throw new Error("The channel channel couldn't be found or hasn't been configured.");

      try {
        const oldName = channel.name;
        await channel.setName(name);

        await interaction.editReply({
          embeds: [{
            ...SetSeverity('success'),
            title: 'General Channel Updated',
            fields: [
              { name: 'Old Name', value: oldName, inline: false },
              { name: 'New Name', value: channel.name, inline: false },
            ],
          }],
        });
      } catch (e: any) {
        if (e instanceof RateLimitError) throw new Error(`Name change limited. Try again in ${msToHuman(e.retryAfter)}`);
        throw new Error(`An unknown error occured while processing your request:\n${e}`);
      }
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }
}

export default new RenameCommand();
