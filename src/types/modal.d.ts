import { ModalSubmitInteraction } from 'discord.js';

export interface Modal<Context> {
  id: string;
  execute(context: Context, interaction: ModalSubmitInteraction, ...args: any): Promise<void>;
}