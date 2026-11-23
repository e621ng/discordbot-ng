import { AttachmentBuilder, ButtonInteraction, MessageFlags, Client } from 'discord.js';
import { Database } from '../shared/Database';
import { Button } from '../types';

class NoteTextButton implements Button<Client> {
  id = 'note-text';

  async execute(context: Client<boolean>, interaction: ButtonInteraction): Promise<void> {
    await interaction.deferReply( { flags: MessageFlags.Ephemeral } );
    
    const userId = interaction.customId.split('_')[1];

    const notes = (await Database.getNotes(userId)).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const noteTexts: string[] = [];

    for (let i = 0; i < notes.length; i++) {
      noteTexts.push(notes[i].reason);
    }

    const content = noteTexts.join('\n\n');
    await interaction.editReply({ files: [new AttachmentBuilder(Buffer.from(content), { name: 'notes.txt' })] });
  }
}

export default new NoteTextButton();
