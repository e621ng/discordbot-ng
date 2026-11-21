import { Client, ModalSubmitInteraction } from 'discord.js';
import { Modal } from '../types';
import { deferInteraction, SetSeverity, syncName } from '../utils';

class SyncNameModal implements Modal<Client> {
  id = 'sync-name-modal';

  async execute(context: Client<boolean>, interaction: ModalSubmitInteraction, id: string): Promise<void> {
    if (!interaction.inGuild()) return;
    await deferInteraction(interaction);

    try {
      const e621Id = Number(interaction.fields.getTextInputValue('id') ?? 0);
      if (isNaN(e621Id)) throw new Error('Provided id is not a number.');

      await syncName(interaction, id, e621Id);
    } catch (error: Error | any) {
      await interaction.editReply({ embeds: [{ ...SetSeverity('error'), description: error.message }] });
    }
  }
}

export default new SyncNameModal();