import { Client } from 'discord.js';
import { Command } from '../types';
import ban from './ban';
import cite from './cite';
import database from './database';
import finduser from './finduser';
import githubMapping from './github-mapping';
import knowledgebase from './knowledgebase';
import link from './link';
import modTicket from './mod-ticket';
import nameSync from './name-sync';
import notes from './notes';
import phrases from './phrases';
import privacy from './privacy';
import privateHelp from './private-help';
import records from './records';
import rename from './rename';
import roleButtons from './role-buttons';
import settings from './settings';
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
  whois,
] as Array<Command<Client<boolean>>>;
