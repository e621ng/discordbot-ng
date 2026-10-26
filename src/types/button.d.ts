import { ButtonInteraction } from 'discord.js';

export interface Button<Context> {
  id: string;
  execute(context: Context, interaction: ButtonInteraction, ...args: any): Promise<void>;
}
