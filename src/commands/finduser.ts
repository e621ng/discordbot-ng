import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { config } from '../config';
import { Command } from '../types';
import { getDiscordAlts, getE621User, SetSeverity } from '../utils';

class FindUserCommand implements Command<Client<boolean>> {
  data = new SlashCommandBuilder()
    .setName('finduser')
    .setDescription("Find a user's discord account based on their e621 usernamename or id.")
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(option =>
      option
        .setName('user')
        .setDescription('The e621 username or e621 id to find the discord user of.')
        .setRequired(true)
    );

  async handleCommand(context: Client<boolean>, interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inGuild()) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const e621User = await getE621User(interaction.options.getString('user', true));
      if (!e621User) throw new Error("I couldn't find any e621 user with that ID.");

      const guild = await context.guilds.fetch(interaction.guildId);
      const content = await getDiscordAlts(e621User.id, guild, 1, [e621User.id]);

      await interaction.editReply({
        embeds: [{
          ...SetSeverity('success'),
          description: `[${e621User.name}](${config.E621_BASE_URL}/users/${e621User.id})<${e621User.id}>'s e621 and discord account(s):\n${content}`
        }]
      });
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }
}

export default new FindUserCommand();
