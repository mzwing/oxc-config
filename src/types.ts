import type { OxfmtConfig } from 'oxfmt'
import type { DummyRuleMap, ExternalPluginEntry, OxlintConfig, OxlintOverride } from 'oxlint'

export interface FeatureOptions {
  files?: string[]
  rules?: DummyRuleMap
}

export interface JsFeatureOptions extends FeatureOptions {
  jsPlugin?: boolean
}

export type Feature = boolean | FeatureOptions
export type JsFeature = boolean | JsFeatureOptions

export interface UnoCssOptions extends FeatureOptions {
  attributify?: boolean
  strict?: boolean
}

export interface OxlintOptions extends Omit<
  OxlintConfig,
  'categories' | 'env' | 'extends' | 'globals' | 'ignorePatterns' | 'jsPlugins' | 'options' | 'overrides' | 'rules'
> {
  additionalJsPlugins?: ExternalPluginEntry[]
  angular?: Feature
  antfu?: boolean
  astro?: boolean
  categories?: OxlintConfig['categories']
  command?: boolean
  comments?: boolean
  e18e?: boolean
  env?: OxlintConfig['env']
  extends?: OxlintConfig[]
  globals?: OxlintConfig['globals']
  ignorePatterns?: string[]
  imports?: boolean
  jsPlugins?: boolean
  jsdoc?: JsFeature
  jsxA11y?: Feature
  nextjs?: Feature
  node?: JsFeature
  options?: Omit<NonNullable<OxlintConfig['options']>, 'typeAware'>
  overrides?: OxlintOverride[]
  react?: JsFeature
  regexp?: boolean
  rules?: DummyRuleMap
  solid?: Feature
  svelte?: boolean
  test?: Feature
  typescript?: Feature
  unicorn?: Feature
  unocss?: boolean | UnoCssOptions
  vue?: Feature
}

export type { DummyRuleMap, ExternalPluginEntry, OxlintConfig, OxlintOverride, OxfmtConfig }
