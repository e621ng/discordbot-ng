import { ButtonInteraction, Client, MessageFlags } from 'discord.js';
import { Button } from '../types';
import { SetSeverity } from '../utils';

class DevWatchButton implements Button<Client> {
  id = 'dev-watch';

  async execute(context: Client<boolean>, interaction: ButtonInteraction): Promise<void> {
    if (!interaction.inGuild()) return;
    await interaction.reply({
      embeds: [{
        ...SetSeverity('warning'),
        description: "DevWatch roles have been deprecated in favour of the `/role-buttons create` command. Please notify an administrator to setup a new role-button."
      }],

      flags: MessageFlags.Ephemeral,
    });
  }
}

export default new DevWatchButton();
