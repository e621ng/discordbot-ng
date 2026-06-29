import checkExpiredBansTask from './check-expired-bans-task';
import closeStaleTicketsTask from './close-stale-tickets-task';
import pruneOldMessagesTask from './prune-old-messages-task';

export default [
  closeStaleTicketsTask,
  checkExpiredBansTask,
  pruneOldMessagesTask
];
