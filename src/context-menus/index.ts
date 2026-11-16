import { Client } from 'discord.js';
import { Command } from '../types';

import report from './message/report';

import addNote from './user/addNote';
import listNotes from './user/listNotes';
import openModTicket from './user/openModTicket';
import records from './user/records';
import syncName from './user/syncName';
import whois from './user/whois';

export default [
  report,
  addNote,
  listNotes,
  openModTicket,
  records,
  syncName,
  whois,
] as Command<Client<boolean>>[];
