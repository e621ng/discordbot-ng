import { Task } from '../../types';
import { Database } from '../../shared/Database';

class PruneOldMessagesTask implements Task {
  interval: number = 3.6e6;
  firstRun: boolean = true;

  async handle(): Promise<void> {
    await Database.pruneOldMessages();
  }
}

export default new PruneOldMessagesTask();
