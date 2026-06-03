import { Client } from 'discord.js';
import { Task } from '../types';
import ScheduledTasks from './tasks';

class Scheduler {
  private tasks = new Map<Task, NodeJS.Timeout>();
  private context: Client;

  constructor(context: Client) {
    this.context = context;
  }

  add(task: Task) {
    const interval = setInterval(() => task.handle(this.context), task.interval);
    if (task.firstRun) interval._onTimeout();

    this.tasks.set(task, interval);
  }
}

export {
  ScheduledTasks, Scheduler
};
