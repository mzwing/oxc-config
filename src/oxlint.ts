import type { FeatureOptions, OxlintOptions, UnoCssOptions } from './types.ts'
import type { DummyRuleMap, ExternalPluginEntry, OxlintConfig, OxlintOverride } from 'oxlint'
import { GLOB_EXCLUDE, GLOB_JSX, GLOB_SRC, GLOB_TESTS, GLOB_TS, GLOB_TSX, GLOB_VUE } from './globs.ts'
import {
  antfuRules,
  baseRules,
  commandRules,
  commentsRules,
  e18eRules,
  jsdocRules,
  jsxA11yRules,
  nodeRules,
  reactRules,
  reactXRules,
  regexpRules,
  solidRules,
  testRules,
  typescriptRules,
  unicornRules,
  vueRules,
} from './rules.ts'

type NativePlugin = NonNullable<OxlintConfig['plugins']>[number]
type ReadonlyRuleMap = Readonly<Record<string, unknown>>

const legacyRuleAliases: Readonly<Record<string, string>> = {
  'antfu/import-dedupe': 'import/no-duplicates',
  'jsdoc/check-param-names': 'jsdoc-extra/check-param-names',
  'jsdoc/check-types': 'jsdoc-extra/check-types',
  'jsdoc/require-returns-check': 'jsdoc-extra/require-returns-check',
  'jsdoc/require-yields-check': 'jsdoc-extra/require-yields-check',
  'jsx-a11y/label-has-for': 'jsx-a11y/label-has-associated-control',
  'no-empty-character-class': 'regexp/no-empty-character-class',
  'no-invalid-regexp': 'regexp/no-invalid-regexp',
  'no-new-symbol': 'no-new-native-nonconstructor',
  'no-useless-backreference': 'regexp/no-useless-backreference',
  'node/no-deprecated-api': 'node-extra/no-deprecated-api',
  'node/prefer-global/buffer': 'node-extra/prefer-global/buffer',
  'node/prefer-global/process': 'node-extra/prefer-global/process',
  'node/process-exit-as-throw': 'node-extra/process-exit-as-throw',
  'react-refresh/only-export-components': 'react/only-export-components',
  'react/dom-no-string-style-prop': 'react/style-prop-object',
  'react/dom-no-unknown-property': 'react/no-unknown-property',
  'test/no-only-tests': 'vitest/no-focused-tests',
  'ts/no-array-constructor': 'no-array-constructor',
  'ts/no-dupe-class-members': 'no-dupe-class-members',
  'ts/no-redeclare': 'no-redeclare',
  'ts/no-unused-expressions': 'no-unused-expressions',
  'ts/no-use-before-define': 'no-use-before-define',
  'unused-imports/no-unused-imports': 'no-unused-vars',
  'unused-imports/no-unused-vars': 'no-unused-vars',
}

const nextjsRules = {
  'nextjs/google-font-display': 'warn',
  'nextjs/google-font-preconnect': 'warn',
  'nextjs/inline-script-id': 'error',
  'nextjs/next-script-for-ga': 'warn',
  'nextjs/no-assign-module-variable': 'error',
  'nextjs/no-async-client-component': 'error',
  'nextjs/no-before-interactive-script-outside-document': 'error',
  'nextjs/no-css-tags': 'error',
  'nextjs/no-document-import-in-page': 'error',
  'nextjs/no-duplicate-head': 'error',
  'nextjs/no-head-element': 'error',
  'nextjs/no-head-import-in-document': 'error',
  'nextjs/no-html-link-for-pages': 'error',
  'nextjs/no-img-element': 'warn',
  'nextjs/no-page-custom-font': 'error',
  'nextjs/no-script-component-in-head': 'error',
  'nextjs/no-styled-jsx-in-document': 'error',
  'nextjs/no-sync-scripts': 'error',
  'nextjs/no-title-in-document-head': 'error',
  'nextjs/no-typos': 'warn',
  'nextjs/no-unwanted-polyfillio': 'error',
} as const

const angularRules = {
  'angular/contextual-lifecycle': 'error',
  'angular/no-empty-lifecycle-method': 'error',
  'angular/no-input-rename': 'error',
  'angular/no-inputs-metadata-property': 'error',
  'angular/no-output-native': 'error',
  'angular/no-output-on-prefix': 'error',
  'angular/no-output-rename': 'error',
  'angular/no-outputs-metadata-property': 'error',
  'angular/prefer-inject': 'error',
  'angular/prefer-standalone': 'error',
  'angular/use-lifecycle-interface': 'error',
  'angular/use-pipe-transform-interface': 'error',
} as const

const jsdocExtraRules = {
  'jsdoc-extra/check-param-names': 'warn',
  'jsdoc-extra/check-types': 'warn',
  'jsdoc-extra/require-returns-check': 'warn',
  'jsdoc-extra/require-yields-check': 'warn',
} as const

const nodeExtraRules = {
  'node-extra/no-deprecated-api': 'error',
  'node-extra/prefer-global/buffer': ['error', 'never'],
  'node-extra/prefer-global/process': ['error', 'never'],
  'node-extra/process-exit-as-throw': 'error',
} as const

const typeAwareRules = {
  'typescript/await-thenable': 'error',
  'typescript/dot-notation': ['error', { allowKeywords: true }],
  'typescript/no-floating-promises': 'error',
  'typescript/no-for-in-array': 'error',
  'typescript/no-implied-eval': 'error',
  'typescript/no-misused-promises': 'error',
  'typescript/no-unnecessary-type-assertion': 'error',
  'typescript/no-unsafe-argument': 'error',
  'typescript/no-unsafe-assignment': 'error',
  'typescript/no-unsafe-call': 'error',
  'typescript/no-unsafe-member-access': 'error',
  'typescript/no-unsafe-return': 'error',
  'typescript/promise-function-async': 'error',
  'typescript/restrict-plus-operands': 'error',
  'typescript/restrict-template-expressions': 'error',
  'typescript/return-await': ['error', 'in-try-catch'],
  'typescript/strict-boolean-expressions': ['error', { allowNullableBoolean: true, allowNullableObject: true }],
  'typescript/switch-exhaustiveness-check': 'error',
  'typescript/unbound-method': 'error',
} as const

const vueGlobals = {
  computed: 'readonly',
  defineEmits: 'readonly',
  defineExpose: 'readonly',
  defineProps: 'readonly',
  onMounted: 'readonly',
  onUnmounted: 'readonly',
  reactive: 'readonly',
  ref: 'readonly',
  shallowReactive: 'readonly',
  shallowRef: 'readonly',
  toRef: 'readonly',
  toRefs: 'readonly',
  watch: 'readonly',
  watchEffect: 'readonly',
} as const

function normalizeRuleName(name: string): string {
  const exactAlias = legacyRuleAliases[name]
  if (exactAlias !== undefined) return exactAlias
  if (name.startsWith('ts/')) return name.replace(/^ts\//, 'typescript/')
  if (name.startsWith('test/')) return name.replace(/^test\//, 'vitest/')
  if (name.startsWith('next/')) return name.replace(/^next\//, 'nextjs/')

  if (name.startsWith('react/')) {
    const reactXName = name.replace(/^react\//, 'react-x/')
    if (reactXName in reactXRules && !(name in reactRules)) return reactXName
  }

  return name
}

function normalizeRules(rules: ReadonlyRuleMap | undefined): DummyRuleMap | undefined {
  if (rules === undefined) return undefined

  const entries = Object.entries(rules)
  const normalized: Record<string, unknown> = {}

  for (const [name, value] of entries) {
    const canonicalName = normalizeRuleName(name)
    if (canonicalName !== name) normalized[canonicalName] = value
  }
  for (const [name, value] of entries) {
    if (normalizeRuleName(name) === name) normalized[name] = value
  }

  return normalized as DummyRuleMap
}

function mergeRules(defaults: ReadonlyRuleMap, rules?: ReadonlyRuleMap): DummyRuleMap {
  return Object.assign({}, defaults, normalizeRules(rules))
}

function normalizeOverride(override: OxlintOverride): OxlintOverride {
  return override.rules === undefined ? override : { ...override, rules: normalizeRules(override.rules) }
}

function normalizeConfig(config: OxlintConfig): OxlintConfig {
  return {
    ...config,
    extends: config.extends?.map(normalizeConfig),
    overrides: config.overrides?.map(normalizeOverride),
    rules: normalizeRules(config.rules),
  }
}

function featureOptions<T extends FeatureOptions>(
  value: boolean | T | undefined,
  enabledByDefault: boolean,
): T | false {
  if (value === false || (value === undefined && !enabledByDefault)) return false
  return typeof value === 'object' ? value : ({} as T)
}

function addOverride(
  overrides: OxlintOverride[],
  feature: FeatureOptions | false,
  defaultFiles: string[],
  rules: ReadonlyRuleMap,
): void {
  if (feature === false) return

  overrides.push({
    files: feature.files ?? defaultFiles,
    rules: mergeRules(rules, feature.rules),
  })
}

function resolvePlugin(name: string, packageName: string): ExternalPluginEntry {
  return {
    name,
    specifier: import.meta.resolve(packageName),
  }
}

export function oxlint(options: OxlintOptions = {}): OxlintConfig {
  const plugins = new Set<NativePlugin>(['oxc', ...(options.plugins ?? [])])
  const jsPlugins: ExternalPluginEntry[] = []
  const overrides: OxlintOverride[] = []
  const rootRules: Record<string, unknown> = { ...baseRules }

  const node = featureOptions(options.node, true)
  const jsdoc = featureOptions(options.jsdoc, true)
  const unicorn = featureOptions(options.unicorn, true)
  const typescript = featureOptions(options.typescript, false)
  const test = featureOptions(options.test, true)
  const jsxA11y = featureOptions(options.jsxA11y, false)
  const vue = featureOptions(options.vue, false)
  const react = featureOptions(options.react, false)
  const nextjs = featureOptions(options.nextjs, false)
  const solid = featureOptions(options.solid, false)
  const angular = featureOptions(options.angular, false)
  const unocss = featureOptions<UnoCssOptions>(options.unocss, false)

  if (options.imports !== false) {
    plugins.add('import')
  } else {
    for (const name of Object.keys(rootRules)) {
      if (name.startsWith('import/')) delete rootRules[name]
    }
  }
  if (node !== false) {
    plugins.add('node')
    const useNodeExtra = options.jsPlugins !== false && node.jsPlugin !== false
    addOverride(overrides, node, [GLOB_SRC], nodeRules)
    if (useNodeExtra) {
      jsPlugins.push(resolvePlugin('node-extra', 'eslint-plugin-n'))
      Object.assign(rootRules, nodeExtraRules)
    }
  }
  if (jsdoc !== false) {
    plugins.add('jsdoc')
    const useJsdocExtra = options.jsPlugins !== false && jsdoc.jsPlugin !== false
    addOverride(overrides, jsdoc, [GLOB_SRC], jsdocRules)
    if (useJsdocExtra) {
      jsPlugins.push(resolvePlugin('jsdoc-extra', 'eslint-plugin-jsdoc'))
      Object.assign(rootRules, jsdocExtraRules)
    }
  }
  if (unicorn !== false) {
    plugins.add('unicorn')
    addOverride(overrides, unicorn, [GLOB_SRC], unicornRules)
  }
  if (typescript !== false) {
    plugins.add('typescript')
    addOverride(overrides, typescript, [GLOB_TS, GLOB_TSX, GLOB_VUE], typescriptRules)
    Object.assign(rootRules, typeAwareRules)
  }
  if (test !== false) {
    plugins.add('vitest')
    addOverride(overrides, test, GLOB_TESTS, testRules)
  }
  if (jsxA11y !== false) {
    plugins.add('jsx-a11y')
    addOverride(overrides, jsxA11y, [GLOB_JSX, GLOB_TSX], jsxA11yRules)
  }
  if (vue !== false) {
    plugins.add('vue')
    addOverride(overrides, vue, [GLOB_VUE], vueRules)
  }
  if (react !== false) {
    plugins.add('react')
    const useReactX = options.jsPlugins !== false && react.jsPlugin !== false
    addOverride(overrides, react, [GLOB_SRC], useReactX ? { ...reactRules, ...reactXRules } : reactRules)
    if (useReactX) jsPlugins.push(resolvePlugin('react-x', '@eslint-react/eslint-plugin'))
  }
  if (nextjs !== false) {
    plugins.add('nextjs')
    addOverride(overrides, nextjs, [GLOB_SRC], nextjsRules)
  }

  if (solid !== false) {
    if (options.jsPlugins === false) throw new Error('[@mzwing/oxc-config] The Solid integration requires JS plugins.')
    jsPlugins.push(resolvePlugin('solid', 'eslint-plugin-solid'))
    addOverride(overrides, solid, [GLOB_JSX, GLOB_TSX], solidRules)
  }
  if (angular !== false) {
    if (options.jsPlugins === false)
      throw new Error('[@mzwing/oxc-config] The Angular integration requires JS plugins.')
    jsPlugins.push(resolvePlugin('angular', '@angular-eslint/eslint-plugin'))
    addOverride(overrides, angular, [GLOB_TS], angularRules)
  }
  if (unocss !== false) {
    if (options.jsPlugins === false) throw new Error('[@mzwing/oxc-config] The UnoCSS integration requires JS plugins.')
    jsPlugins.push(resolvePlugin('unocss', '@unocss/eslint-plugin'))
    addOverride(overrides, unocss, [GLOB_SRC], {
      'unocss/order': 'warn',
      ...(unocss.attributify === false ? {} : { 'unocss/order-attributify': 'warn' }),
      ...(unocss.strict === true ? { 'unocss/blocklist': 'error' } : {}),
    })
  }

  if (options.jsPlugins !== false && options.antfu !== false) {
    jsPlugins.push(resolvePlugin('antfu', 'eslint-plugin-antfu'))
    Object.assign(rootRules, antfuRules)
  }
  if (options.jsPlugins !== false && options.comments !== false) {
    jsPlugins.push(resolvePlugin('eslint-comments', '@eslint-community/eslint-plugin-eslint-comments'))
    Object.assign(rootRules, commentsRules)
  }
  if (options.jsPlugins !== false && options.command !== false) {
    jsPlugins.push(resolvePlugin('command', 'eslint-plugin-command'))
    Object.assign(rootRules, commandRules)
  }
  if (options.jsPlugins !== false && options.e18e !== false) {
    jsPlugins.push(resolvePlugin('e18e', '@e18e/eslint-plugin'))
    Object.assign(rootRules, e18eRules)
  }
  if (options.jsPlugins !== false && options.regexp !== false) {
    jsPlugins.push(resolvePlugin('regexp', 'eslint-plugin-regexp'))
    Object.assign(rootRules, regexpRules)
  }

  if (options.jsPlugins === false && (options.additionalJsPlugins?.length ?? 0) > 0)
    throw new Error('[@mzwing/oxc-config] `additionalJsPlugins` cannot be used when `jsPlugins` is false.')

  if (options.additionalJsPlugins) jsPlugins.push(...options.additionalJsPlugins)

  return {
    categories: {
      correctness: 'off',
      ...options.categories,
    },
    env: {
      astro: options.astro ?? false,
      browser: true,
      builtin: true,
      es2026: true,
      node: true,
      svelte: options.svelte ?? false,
      vue: vue !== false,
      ...options.env,
    },
    extends: options.extends?.map(normalizeConfig),
    globals: {
      ...(vue !== false ? vueGlobals : {}),
      ...options.globals,
    },
    ignorePatterns: [...GLOB_EXCLUDE, ...(options.ignorePatterns ?? [])],
    jsPlugins: jsPlugins.length > 0 ? jsPlugins : undefined,
    options: {
      reportUnusedDisableDirectives: 'error',
      ...options.options,
      typeAware: typescript !== false,
    },
    overrides: [...overrides, ...(options.overrides ?? []).map(normalizeOverride)],
    plugins: [...plugins],
    rules: mergeRules(rootRules, options.rules),
    settings: options.settings,
  }
}
