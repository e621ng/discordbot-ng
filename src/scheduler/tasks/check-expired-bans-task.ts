import { Client } from "discord.js";
import { Task } from "../../types";
import { checkExpiredBans } from "../../utils";

class CheckExpiredBansTask implements Task {
  interval: number = 300000;
  firstRun: boolean = true;

  async handle(context: Client): Promise<void> {
    await checkExpiredBans(context);
  }
}

export default new CheckExpiredBansTask();