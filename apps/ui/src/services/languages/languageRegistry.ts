import { Parser } from '@lezer/common';
import {
  tokenizeAssembly,
  tokenizeCpp,
  tokenizeCSharp,
  tokenizeFortran,
  tokenizeGo,
  tokenizeJava,
  tokenizePascal,
  tokenizePhp,
  tokenizeR,
  tokenizeRust,
  tokenizeScratch,
  tokenizeVisualBasic,
  TokenizerFn,
} from './customTokenizers';
import { createCustomLanguageParser, highlightWithTokenizer } from './createLanguageParser';

export interface LanguageDefinition {
  name: string;
  aliases: string[];
  display: string;
  tokenizer: TokenizerFn;
  parser: Parser;
}

const definitions: Array<{ name: string; aliases: string[]; display: string; tokenizer: TokenizerFn }> = [
  {
    name: 'cpp',
    aliases: ['c', 'cpp', 'c++', 'cc', 'cxx', 'h', 'hpp', 'hh', 'hxx'],
    display: 'C / C++',
    tokenizer: tokenizeCpp,
  },
  {
    name: 'java',
    aliases: ['java', 'jsp'],
    display: 'Java',
    tokenizer: tokenizeJava,
  },
  {
    name: 'csharp',
    aliases: ['c#', 'csharp', 'cs', 'dotnet'],
    display: 'C#',
    tokenizer: tokenizeCSharp,
  },
  {
    name: 'rust',
    aliases: ['rust', 'rs'],
    display: 'Rust',
    tokenizer: tokenizeRust,
  },
  {
    name: 'r',
    aliases: ['r', 'rscript'],
    display: 'R',
    tokenizer: tokenizeR,
  },
  {
    name: 'vb',
    aliases: ['visual basic', 'visualbasic', 'vb', 'vba', 'vbnet', 'vb.net', 'basic'],
    display: 'Visual Basic',
    tokenizer: tokenizeVisualBasic,
  },
  {
    name: 'pascal',
    aliases: ['pascal', 'pas', 'delphi', 'lpr'],
    display: 'Pascal',
    tokenizer: tokenizePascal,
  },
  {
    name: 'scratch',
    aliases: ['scratch', 'scratchblocks', 'sb3', 'sb2', 'blocks'],
    display: 'Scratch',
    tokenizer: tokenizeScratch,
  },
  {
    name: 'php',
    aliases: ['php', 'php3', 'php4', 'php5', 'php7', 'php8', 'phtml'],
    display: 'PHP',
    tokenizer: tokenizePhp,
  },
  {
    name: 'go',
    aliases: ['go', 'golang'],
    display: 'Go',
    tokenizer: tokenizeGo,
  },
  {
    name: 'fortran',
    aliases: ['fortran', 'f90', 'f95', 'f03', 'f08', 'f77', 'for', 'f'],
    display: 'Fortran',
    tokenizer: tokenizeFortran,
  },
  {
    name: 'assembly',
    aliases: ['assembly', 'asm', 'nasm', 'masm', 'gas', 's', 'x86', 'x64', 'arm', 'aarch64', 'riscv'],
    display: 'Assembly',
    tokenizer: tokenizeAssembly,
  },
];

export const customLanguageParsers: Record<string, Parser> = {};
export const customLanguageTokenizers: Record<string, TokenizerFn> = {};
export const languageDisplayNames: Record<string, string> = {};

for (const def of definitions) {
  const parser = createCustomLanguageParser(def.tokenizer);
  for (const alias of def.aliases) {
    const key = alias.toLowerCase().trim();
    customLanguageParsers[key] = parser;
    customLanguageTokenizers[key] = def.tokenizer;
    languageDisplayNames[key] = def.display;
  }
}

/**
 * Returns formatted display title for a code language identifier.
 */
export function getLanguageDisplayLabel(rawLang: string): string {
  if (!rawLang) return 'Code';
  const clean = rawLang.trim().toLowerCase();
  if (languageDisplayNames[clean]) {
    return languageDisplayNames[clean];
  }
  // Standard built-ins
  const map: Record<string, string> = {
    js: 'JavaScript',
    javascript: 'JavaScript',
    ts: 'TypeScript',
    typescript: 'TypeScript',
    jsx: 'React JSX',
    tsx: 'React TSX',
    py: 'Python',
    python: 'Python',
    json: 'JSON',
    html: 'HTML',
    xml: 'XML',
    css: 'CSS',
    sql: 'SQL',
    sh: 'Shell',
    bash: 'Bash',
    zsh: 'Zsh',
    yaml: 'YAML',
    yml: 'YAML',
    markdown: 'Markdown',
    md: 'Markdown',
  };
  if (map[clean]) return map[clean];
  // Uppercase acronyms or Capitalize first letter
  if (clean.length <= 3) return clean.toUpperCase();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Attempts to highlight using custom tokenizers if registered.
 */
export function tryCustomHighlight(code: string, language: string): string | null {
  const clean = (language || '').toLowerCase().trim();
  const tokenizer = customLanguageTokenizers[clean];
  if (tokenizer) {
    return highlightWithTokenizer(code, tokenizer);
  }
  return null;
}
