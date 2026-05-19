import { ApplicationIntegrationType, ChatInputCommandInteraction, Client, InteractionContextType, LabelBuilder, ModalBuilder, PermissionFlagsBits, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export default {
  name: 'mod-ticket',
  data: new SlashCommandBuilder()
    .setName('mod-ticket')
    .setDescription('Opens a mod private ticket and pulls the user into it.')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to pull in to the ticket.')
        .setRequired(true)
    ),
  handler: async function (client: Client, interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return interaction.editReply('This command must be used in a server.');

    const user = interaction.options.getUser('user', true);
    const member = await interaction.guild.members.fetch(user.id);

    if (!member) return interaction.editReply('Could not find member.');

    const modal = new ModalBuilder()
      .setCustomId(`open-mod-ticket_${user.id}`)
      .setTitle(`Opening A Mod Ticket With ${member.displayName}`);

    const titleInput = new TextInputBuilder()
      .setCustomId('title')
      .setMaxLength(100)
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const titleLabel = new LabelBuilder()
      .setLabel('Title')
      .setDescription(`The name of the thread. Defaults to "Mod Ticket For ${member.displayName}" if left empty`)
      .setTextInputComponent(titleInput);

    const initialMessageInput = new TextInputBuilder()
      .setCustomId('initial-message')
      .setMaxLength(1800)
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    const initialMessageLabel = new LabelBuilder()
      .setLabel('Inital Message')
      .setDescription('The inital message sent in the thread')
      .setTextInputComponent(initialMessageInput);

    const yesNoMenu = new StringSelectMenuBuilder()
      .setCustomId('auto-join-thread')
      .setRequired(false)
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Yes')
          .setDefault(true)
          .setValue('yes'),
        new StringSelectMenuOptionBuilder()
          .setLabel('No')
          .setDefault(false)
          .setValue('no')
      );

    const autoJoinLabel = new LabelBuilder()
      .setLabel('Auto Join Thread')
      .setDescription('Whether or not to join you to the thread. Selecting no will not notify you of messages sent!')
      .setStringSelectMenuComponent(yesNoMenu);

    modal.addLabelComponents(titleLabel, initialMessageLabel, autoJoinLabel);

    interaction.showModal(modal);
  }
};