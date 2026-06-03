import { formatMarkdown, parseDTextToAST } from '@clynamic/dmark';

export function dtextToMarkdown(dtext: string): string {
  return formatMarkdown(parseDTextToAST(dtext)).output;
}