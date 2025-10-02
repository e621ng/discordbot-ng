import { Database } from '../shared/Database';

const mentionRegex = new RegExp('@([\\S]+),|@([\\S]+)', 'gi');
const issueLinkRegex = new RegExp('\\s?\\(\\[(#\\d+)\\]\\(https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*)\\)', 'gi');

export async function fixPings(body: string): Promise<string> {
  const mappings = await Database.getAllGithubUserMappings();

  return body.replaceAll(mentionRegex, (match, m1, m2) => {
    const name = m1 ?? m2;
    const mapping = mappings.find(m => m.github_username == name);

    return mapping ? `<@${mapping.discord_id}>` : match;
  });
}

export function removeIssueLinks(body: string): string {
  return body.replaceAll(issueLinkRegex, '');
}