import { createClient } from '@redis/client';
import { Client } from 'discord.js';
import { banUpdateHandler, ticketUpdateHandler } from '../utils';

let discordClient: Client;

export async function openRedisClient(url: string, discClient: Client) {
  const client = await createClient({
    url: `redis://${url}`,
    socket: {
      reconnectStrategy: 60000
    }
  });

  await client.connect();

  discordClient = discClient;

  console.log('Connected to redis database');

  await client.subscribe(['ticket_updates', 'ban_updates'], updateHandler);
}

function updateHandler(data: string, channel: string) {
  switch (channel) {
    case 'ticket_updates':
      return ticketUpdateHandler(discordClient, data);
    case 'ban_updates':
      return banUpdateHandler(discordClient, data);
  }
}