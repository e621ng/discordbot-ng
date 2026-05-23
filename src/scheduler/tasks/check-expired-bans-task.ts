import { Client } from "discord.js";
import { Task } from "../../types";
import { checkExpiredBans } from "../../utils";

const checkExpiredBansTask: Task = {
  interval: 300000,
  firstRun: true,

  handle: async (context: Client) => await checkExpiredBans(context)
};

export default checkExpiredBansTask;