import type { DummyRuleMap, ExternalPluginEntry, OxlintConfig } from 'oxlint'

export type Rules = DummyRuleMap

export type Ignores = string[] | ((originals: string[]) => string[])

export interface OptionsOverrides {
  overrides?: Rules
}

interface FlatGitignoreOptions {
  cwd?: string
  files?: string | string[]
  filesGitModules?: string | string[]
  recursive?: boolean | { skipDirs: string[] }
  root?: boolean
  strict?: boolean
}

interface OptionsNode {
  jsPlugin?: boolean
}

interface OptionsJSDoc {
  jsPlugin?: boolean
}

export interface OptionsTypescript extends OptionsOverrides {
  erasableOnly?: boolean
  filesTypeAware?: string[]
  ignoresTypeAware?: string[]
  overridesTypeAware?: Rules
}

export interface OptionsJSXA11y extends OptionsOverrides {}

export interface OptionsJSX {
  a11y?: boolean | OptionsJSXA11y
}

export interface OptionsE18e extends OptionsOverrides {
  modernization?: boolean
  moduleReplacements?: boolean
  performanceImprovements?: boolean
}

export interface OptionsUnicorn extends OptionsOverrides {
  allRecommended?: boolean
}

export interface OptionsReact extends OptionsOverrides {
  jsPlugin?: boolean
}

export interface OptionsRegExp extends OptionsOverrides {
  level?: 'error' | 'warn'
}

export interface OptionsUnoCSS extends OptionsOverrides {
  attributify?: boolean
  strict?: boolean
}

export interface OptionsConfig {
  additionalJsPlugins?: ExternalPluginEntry[]
  angular?: boolean | OptionsOverrides
  autoRenamePlugins?: boolean
  e18e?: boolean | OptionsE18e
  gitignore?: boolean | FlatGitignoreOptions
  ignores?: Ignores
  imports?: boolean | OptionsOverrides
  isInEditor?: boolean
  javascript?: OptionsOverrides
  jsPlugins?: boolean
  jsdoc?: boolean | OptionsJSDoc
  jsx?: boolean | OptionsJSX
  lessOpinionated?: boolean
  nextjs?: boolean | OptionsOverrides
  node?: boolean | OptionsNode
  plugins?: OxlintConfig['plugins']
  react?: boolean | OptionsReact
  regexp?: boolean | OptionsRegExp
  rules?: Rules
  settings?: OxlintConfig['settings']
  solid?: boolean | OptionsOverrides
  test?: boolean | OptionsOverrides
  type?: 'app' | 'lib'
  typescript?: boolean | OptionsTypescript
  unicorn?: boolean | OptionsUnicorn
  unocss?: boolean | OptionsUnoCSS
  vue?: boolean | OptionsOverrides
}

export type { ExternalPluginEntry } from 'oxlint'
