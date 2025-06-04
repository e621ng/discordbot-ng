export const postIDRegex = new RegExp('post #([0-9]+)', 'gi');
export const userIDRegex = new RegExp('user #([0-9]+)', 'gi');
export const forumTopicIDRegex = new RegExp('topic #([0-9]+)', 'gi');
export const commentIDRegex = new RegExp('comment #([0-9]+)', 'gi');
export const blipIDRegex = new RegExp('blip #([0-9]+)', 'gi');
export const poolIDRegex = new RegExp('pool #([0-9]+)', 'gi');
export const setIDRegex = new RegExp('set #([0-9]+)', 'gi');
export const takedownIDRegex = new RegExp('takedown #([0-9]+)', 'gi');
export const recordIDRegex = new RegExp('record #([0-9]+)', 'gi');
export const ticketIDRegex = new RegExp('ticket #([0-9]+)', 'gi');

const tagSearchRegex = '(?:[\\S]| )+?';
export const wikiLinkRegex = new RegExp(`\\[\\[(${tagSearchRegex})]]`, 'gi');
export const searchLinkRegex = new RegExp(`{{(${tagSearchRegex})}}`, 'gi');