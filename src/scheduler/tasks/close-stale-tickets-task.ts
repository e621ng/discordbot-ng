import { Client } from "discord.js";
import { Task } from "../../types";
import { closeOldTickets } from "../../utils";

const closeStaleTicketsTask: Task = {
  interval: 3.6e+6,
  firstRun: true,

  handle: async (context: Client) => await closeOldTickets(context)
};

export default closeStaleTicketsTask;