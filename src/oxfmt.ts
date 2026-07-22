import type { Ignores } from './types.ts'
import type { OxfmtConfig, SortImportsConfig } from 'oxfmt'
import { GLOB_EXCLUDE } from './globs.ts'

type KnownOxfmtConfig = {
  [Key in keyof OxfmtConfig as string extends Key
    ? never
    : number extends Key
      ? never
      : symbol extends Key
        ? never
        : Key]: OxfmtConfig[Key]
}

export type OxfmtOptions = Omit<KnownOxfmtConfig, 'ignorePatterns'> & {
  ignores?: Ignores
}

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

export function oxfmt(options: OxfmtOptions = {}): OxfmtConfig {
  if ('ignorePatterns' in options) {
    throw new TypeError('[@mzwing/oxc-config] Unsupported `ignorePatterns` option. Use `ignores` instead.')
  }

  const { ignores = [], ...nativeOptions } = options
  const ignorePatterns = typeof ignores === 'function' ? ignores([...GLOB_EXCLUDE]) : [...GLOB_EXCLUDE, ...ignores]
  const sortImports =
    nativeOptions.sortImports === undefined || nativeOptions.sortImports === true
      ? defaultSortImports
      : typeof nativeOptions.sortImports === 'object'
        ? { ...defaultSortImports, ...nativeOptions.sortImports }
        : false

  return {
    ...oxfmtDefaults,
    ...nativeOptions,
    ignorePatterns,
    sortImports,
  }
}
