import type { OxfmtConfig, SortImportsConfig } from 'oxfmt'
import { GLOB_EXCLUDE } from './globs.ts'

const defaultSortImports: SortImportsConfig = {
  groups: ['type', 'builtin', 'external', 'internal', ['parent', 'sibling', 'index'], 'side_effect', 'unknown'],
  newlinesBetween: false,
  order: 'asc',
  sortSideEffects: false,
}

export const oxfmtDefaults = {
  arrowParens: 'avoid',
  endOfLine: 'lf',
  jsxSingleQuote: false,
  printWidth: 120,
  proseWrap: 'preserve',
  semi: false,
  singleQuote: true,
  sortImports: defaultSortImports,
  sortPackageJson: true,
  tabWidth: 2,
  trailingComma: 'all',
  useTabs: false,
} satisfies OxfmtConfig

export function oxfmt(options: OxfmtConfig = {}): OxfmtConfig {
  const sortImports =
    options.sortImports === undefined || options.sortImports === true
      ? defaultSortImports
      : typeof options.sortImports === 'object'
        ? { ...defaultSortImports, ...options.sortImports }
        : false

  return {
    ...oxfmtDefaults,
    ...options,
    ignorePatterns: [...GLOB_EXCLUDE, ...(options.ignorePatterns ?? [])],
    sortImports,
  }
}
