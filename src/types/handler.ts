import { Client, Interaction } from 'discord.js';

type HandlerFunction = (client: Client, interaction: Interaction, ...args: any) => Promise<void>

export interface Handler {
  name: string;
  handler: HandlerFunction;
  init?: (client: Client) => Promise<void>;
  autoComplete?: HandlerFunction;
}