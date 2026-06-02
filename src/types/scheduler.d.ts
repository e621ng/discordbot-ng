import { Client } from "discord.js";

export interface Task {
  interval: number;
  firstRun: boolean;

  handle(context: Client): Promise<void>;
};
