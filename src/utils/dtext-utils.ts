import { BlockNode, DocumentNode, formatMarkdown, InlineNode, LinkNode, MarkdownFormatContext, MarkdownHandlers, markdownHandlers, parseDTextToAST, SpoilerBlockNode, TableBodyNode, TableHeadNode, TableLiteralNode, TableRowNode, TextNode } from '@clynamic/dmark';
import { config } from '../config';
import { E621Post } from '../types';
import { getManyE621Posts, PostAction, SEARCH_LIMIT, spoilerOrBlacklist } from './e621-utils';

export async function parseDTextToMarkdown(text: string): Promise<string> {
  const ast = parseDTextToAST(text, {
    baseUrl: config.E621_BASE_URL,
    allowColor: false
  }) as DocumentNode;

  const postIds: string[][] = [];

  const recurseChildren = (node: BlockNode | InlineNode | TableHeadNode | TableBodyNode | TableRowNode | TableLiteralNode | LinkNode) => {

    if (node.type == 'link' && node.linkType == 'id_link' && node.id) {
      if (postIds.length == 0 || postIds.at(-1)!.length >= SEARCH_LIMIT) postIds.push([]);
      postIds.at(-1)!.push(node.id);
    }

    if ('children' in node && node.children !== undefined) {
      for (const child of node.children) recurseChildren(child);
    }
  };

  for (const child of ast.children) recurseChildren(child);

  const postData: E621Post[] = [];

  for (const chunk of postIds) {
    postData.push(...await getManyE621Posts(chunk));
  }

  const handlers: MarkdownHandlers = {
    ...markdownHandlers,

    spoiler_block: (node: SpoilerBlockNode, out: string[], ctx: MarkdownFormatContext) => {
      for (let i = 0; i < node.children.length; i++) {
        ctx.atLineStart = true;

        if (i > 0) out.push('\n\n');

        out.push('||');
        ctx.render(node.children[i], out);
        out.push('||');
      }

      ctx.atLineStart = false;
    },

    link: (node: LinkNode, out: string[], ctx: MarkdownFormatContext) => {
      ctx.atLineStart = false;
      if (node.linkType == 'wiki') {
        formatWikiLink(node, out);
      } else if (node.linkType == 'id_link' && node.idType == 'post') {
        const post = postData.find(p => p.id == Number(node.id));
        if (post && spoilerOrBlacklist(post).action == PostAction.Blacklist) {
          out.push('post #', node.id!);
        } else {
          out.push('[');
          out.push('post #', node.id!);
          out.push(']');
          out.push(`(${node.href.startsWith('/') ? config.E621_BASE_URL : ''}${node.href})`);
        }
      } else if (node.linkType == 'url') {
        out.push(`${node.href.startsWith('/') ? config.E621_BASE_URL : ''}${node.href}`);
      } else if (node.linkType == 'inline') {
        out.push('[');
        if (node.children) {
          for (const child of node.children) {
            ctx.render(child, out);
          }
        } else {
          out.push('-NO TITLE-');
        }
        out.push(']');
        out.push(`(${node.href.startsWith('/') ? config.E621_BASE_URL : ''}${node.href})`);
      } else {
        out.push('[');
        markdownHandlers.link(node, out, ctx);
        out.push(']');
        out.push(`(${node.href.startsWith('/') ? config.E621_BASE_URL : ''}${node.href})`);
      }
    }
  };

  return formatMarkdown(ast, {}, handlers).output;
}


// Modified from
// https://github.com/clragon/dmark/blob/main/src/ast/text.ts#L17-L21
// https://github.com/clragon/dmark/blob/main/src/md/render/index.ts#L481-L531
const RE_HAS_UPPER = /[A-Z]/;
export function asciiLowercase(s: string): string {
  if (!RE_HAS_UPPER.test(s)) return s;
  return s.replace(/[A-Z]/g, c => String.fromCharCode(c.charCodeAt(0) + 32));
}

function formatWikiLink(node: LinkNode, out: string[]): void {
  // Same dispatch as the dtext sibling formatter (ADR-0004). Anchor-only
  // form has two variants (`[[#anchor]]` and `[[#anchor|title]]`); detect
  // title-override by comparing children content to the default form.
  if (node.href.startsWith('#') && node.anchor !== undefined) {
    const childText
      = node.children?.[0] && node.children[0].type === 'text'
        ? (node.children[0] as TextNode).content
        : '';
    if (childText === `#${node.anchor}` || childText === '') {
      out.push('[[#', node.anchor, ']]');
    } else {
      out.push('[[#', childText, ']]');
    }
    return;
  }

  const childText
    = node.children?.[0] && node.children[0].type === 'text'
      ? (node.children[0] as TextNode).content
      : '';

  out.push('[', '[[', childText, ']]', ']', `(${config.E621_BASE_URL}${node.href})`);
}