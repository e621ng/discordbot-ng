import { ClientEvents } from 'discord.js';

export interface Event<Context, E extends keyof ClientEvents> {
  readonly event: E;
  execute(context: Context, ...args: ClientEvents[E]): Promise<void>;
}
