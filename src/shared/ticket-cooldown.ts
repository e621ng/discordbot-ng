export const ticketCooldownMap = new Map<string, number>();

export function pruneOldTickets() {
  const keys = Array.from(ticketCooldownMap.keys());
  for (const key of keys) {
    if (Date.now() >= ticketCooldownMap.get(key)!)
      ticketCooldownMap.delete(key);
  }
}