import checkExpiredBansTask from './checkExpiredBansTask';
import closeStaleTicketsTask from './closeStaleTicketsTask';
import pruneOldMessagesTask from './pruneOldMessagesTask';

export default [
  closeStaleTicketsTask,
  checkExpiredBansTask,
  pruneOldMessagesTask
];
