import { Client } from 'discord.js';
import { Command } from '../types';

import ban from './ban';
import cite from './cite';
import database from './database';
import finduser from './finduser';
import githubMapping from './githubMapping';
import knowledgebase from './knowledgebase';
import link from './link';
import modTicket from './modTicket';
import nameSync from './nameSync';
import notes from './notes';
import phrases from './phrases';
import privacy from './privacy';
import privateHelp from './privateHelp';
import records from './records';
import rename from './rename';
import roleButtons from './roleButtons';
import settings from './settings';
import softban from './softban';
import whois from './whois';

export default [
  ban,
  cite,
  database,
  finduser,
  githubMapping,
  knowledgebase,
  link,
  modTicket,
  nameSync,
  notes,
  phrases,
  privacy,
  privateHelp,
  records,
  rename,
  roleButtons,
  settings,
  softban,
  whois,
] as Command<Client<boolean>>[];
