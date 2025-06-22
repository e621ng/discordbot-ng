import { Database } from '../shared/Database';

const mentionRegex = new RegExp('@([\\S]+)', 'gi');

export async function fixPings(body: string): Promise<string> {
  const mappings = await Database.getAllGithubUserMappings();

  return body.replaceAll(mentionRegex, (match, username) => {
    const mapping = mappings.find(m => m.github_username == username);

    return mapping ? `<@${mapping.discord_id}>` : match;
  });
}