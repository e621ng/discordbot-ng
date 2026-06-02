import checkExpiredBansTask from './check-expired-bans-task';
import closeStaleTicketsTask from './close-stale-tickets-task';

export default [
  closeStaleTicketsTask,
  checkExpiredBansTask,
];
