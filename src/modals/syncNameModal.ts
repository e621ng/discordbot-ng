import { Client, ModalSubmitInteraction } from 'discord.js';
import { Modal } from '../types';
import { deferInteraction, syncName } from '../utils';

class SyncNameModal implements Modal<Client> {
  id = 'sync-name-modal';

  async execute(context: Client<boolean>, interaction: ModalSubmitInteraction, id: string): Promise<void> {
    if (!interaction.inGuild()) return;
    await deferInteraction(interaction);

    try {
      const e621Id = Number(interaction.fields.getTextInputValue('id') ?? 0);
      if (isNaN(e621Id)) throw new Error('Provided id is not a number.');

      const guild = await context.guilds.fetch(interaction.guildId);
      const member = await guild.members.fetch(id);
      if (!member) throw new Error('Unable to fetch the target member.');

      await syncName(interaction, member, e621Id);
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }
}

export default new SyncNameModal();