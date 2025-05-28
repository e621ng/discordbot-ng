import { AnyThreadChannel } from 'discord.js';

export async function handleThreadCreate(thread: AnyThreadChannel, newlyCreated: boolean) {
  try {
    await thread.join();
  } catch (e) {
    console.error('Failed to join thread:');
    console.error(e);
  }

}