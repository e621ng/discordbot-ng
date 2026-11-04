import clientReady from './client/clientReady';
import auditLogCreate from './guild/guildAuditLogEntryCreate';
import guildBanRemove from './guild/guildBanRemove';
import guildCreate from './guild/guildCreate';
import guildMemberAdd from './guild/guildMemberAdd';
import messageCreate from './message/messageCreate';
import messageDelete from './message/messageDelete';
import messageDeleteBulk from './message/messageDeleteBulk';
import messageUpdate from './message/messageUpdate';
import threadCreate from './thread/threadCreate';
import voiceStateUpdate from './voice/voiceStateUpdate';

export default [
  auditLogCreate,
  clientReady,
  guildBanRemove,
  guildCreate,
  guildMemberAdd,
  messageCreate,
  messageDelete,
  messageDeleteBulk,
  messageUpdate,
  threadCreate,
  voiceStateUpdate
];
