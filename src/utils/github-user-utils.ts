import { Database } from '../shared/Database';

const mentionRegex = new RegExp('@([\\S]+),|@([\\S]+)', 'gi');

export async function fixPings(body: string): Promise<string> {
  const mappings = await Database.getAllGithubUserMappings();

  return body.replaceAll(mentionRegex, (match, m1, m2) => {
    const name = m1 ?? m2;
    const mapping = mappings.find(m => m.github_username == name);

    return mapping ? `<@${mapping.discord_id}>` : match;
  });
}