import { createClient, SocketClosedUnexpectedlyError } from '@redis/client';
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

  client.on('error', (error) => {
    if (error.code == 'ECONNREFUSED') {
      console.error("Couldn't connect to redis database: Connection refused (is redis on? is the port reachable?)");
    } else if (error instanceof SocketClosedUnexpectedlyError) {
      console.error('Redis server closed unexpectedly. Attempting reconnect every 60 seconds.');
    } else {
      console.error('Redis error:');
      console.error(error);
    }
  });

  client.on('connect', () => {
    console.log('Connected to redis database');
  });

  client.on('reconnecting', () => {
    console.log('Attempting to reconnect to redis database');
  });

  client.once('connect', () => {
    client.subscribe(['ticket_updates', 'ban_updates'], updateHandler);
  });

  client.connect();

  discordClient = discClient;
}

function updateHandler(data: string, channel: string) {
  switch (channel) {
    case 'ticket_updates':
      return ticketUpdateHandler(discordClient, data);
    case 'ban_updates':
      return banUpdateHandler(discordClient, data);
  }
}