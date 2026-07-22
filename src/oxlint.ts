import type {
  OptionsConfig,
  OptionsE18e,
  OptionsJSXA11y,
  OptionsOverrides,
  OptionsRegExp,
  OptionsTypescript,
  OptionsUnicorn,
  OptionsUnoCSS,
} from './types.ts'
import type { DummyRuleMap, ExternalPluginEntry, OxlintConfig, OxlintOverride } from 'oxlint'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'
import { GLOB_JSX, GLOB_SRC, GLOB_TESTS, GLOB_TS, GLOB_TSX, GLOB_VUE } from './globs.ts'
import { resolveIgnorePatterns } from './ignores.ts'
import {
  antfuImportRules,
  antfuRules,
  baseRules,
  commandRules,
  commentsRules,
  e18eModernizationRules,
  e18eModuleReplacementRules,
  e18ePerformanceRules,
  importRules,
  jsdocRules,
  jsxA11yRules,
  nodeRules,
  reactRules,
  reactXRules,
  regexpRules,
  solidRules,
  testRules,
  typescriptLibraryRules,
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

const erasableSyntaxOnlyRules = {
  'erasable-syntax-only/enums': 'error',
  'erasable-syntax-only/import-aliases': 'error',
  'erasable-syntax-only/namespaces': 'error',
  'erasable-syntax-only/parameter-properties': 'error',
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

const sourceExtensions = '{js,mjs,cjs,jsx,mjsx,cjsx,ts,mts,cts,tsx,mtsx,ctsx}'
const reactRefreshAllowConstantExportPackages = ['vite']
const remixPackages = ['@remix-run/node', '@remix-run/react', '@remix-run/serve', '@remix-run/dev']
const reactRouterPackages = ['@react-router/node', '@react-router/react', '@react-router/serve', '@react-router/dev']
const nextPackages = ['next']

function normalizeRuleName(name: string): string {
  const exactAlias = legacyRuleAliases[name]
  if (exactAlias !== undefined) return exactAlias
  if (name.startsWith('ts/')) return `typescript/${name.slice(3)}`
  if (name.startsWith('test/')) return `vitest/${name.slice(5)}`
  if (name.startsWith('next/')) return `nextjs/${name.slice(5)}`

  if (name.startsWith('react/')) {
    const reactXName = `react-x/${name.slice(6)}`
    if (reactXName in reactXRules && !(name in reactRules)) return reactXName
  }

  return name
}

function normalizeRules(rules: ReadonlyRuleMap | undefined, rename: boolean): DummyRuleMap | undefined {
  if (rules === undefined) return undefined
  if (!rename) return { ...rules } as DummyRuleMap

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

function renameRulePrefix(rules: ReadonlyRuleMap | undefined, from: string, to: string): DummyRuleMap | undefined {
  if (rules === undefined) return undefined

  return Object.fromEntries(
    Object.entries(rules).map(([name, value]) => [
      name.startsWith(`${from}/`) ? `${to}${name.slice(from.length)}` : name,
      value,
    ]),
  ) as DummyRuleMap
}

function mergeRules(defaults: ReadonlyRuleMap, rules: ReadonlyRuleMap | undefined, rename: boolean): DummyRuleMap {
  return Object.assign({}, defaults, normalizeRules(rules, rename))
}

function optionObject<T extends object>(value: boolean | T | undefined, enabledByDefault: boolean): T | false {
  if (value === false || (value === undefined && !enabledByDefault)) return false
  return typeof value === 'object' ? value : ({} as T)
}

function addOverride(
  overrides: OxlintOverride[],
  files: string[],
  rules: ReadonlyRuleMap,
  userRules: ReadonlyRuleMap | undefined,
  rename: boolean,
  excludeFiles?: string[],
): void {
  overrides.push({
    ...(excludeFiles === undefined ? {} : { excludeFiles }),
    files,
    rules: mergeRules(rules, userRules, rename),
  })
}

function resolvePlugin(name: string, packageName: string): ExternalPluginEntry {
  return { name, specifier: import.meta.resolve(packageName) }
}

function loadUnicornRecommendedRules(): ReadonlyRuleMap {
  const require = createRequire(import.meta.url)
  const module = require('eslint-plugin-unicorn') as {
    default?: { configs: { recommended: { rules: ReadonlyRuleMap } } }
    configs?: { recommended: { rules: ReadonlyRuleMap } }
  }
  const plugin = module.default ?? module

  if (plugin.configs === undefined) {
    throw new Error('[@mzwing/oxc-config] Failed to load `eslint-plugin-unicorn` recommended rules.')
  }

  return plugin.configs.recommended.rules
}

function reactRefreshRule(): readonly [string, { allowConstantExport: boolean; allowExportNames: string[] }] {
  const isUsingNext = nextPackages.some(packageName => isPackageExists(packageName))
  const isUsingRemix = remixPackages.some(packageName => isPackageExists(packageName))
  const isUsingReactRouter = reactRouterPackages.some(packageName => isPackageExists(packageName))

  return [
    'error',
    {
      allowConstantExport: reactRefreshAllowConstantExportPackages.some(packageName => isPackageExists(packageName)),
      allowExportNames: [
        ...(isUsingNext
          ? [
              'dynamic',
              'dynamicParams',
              'revalidate',
              'fetchCache',
              'runtime',
              'preferredRegion',
              'maxDuration',
              'generateStaticParams',
              'metadata',
              'generateMetadata',
              'viewport',
              'generateViewport',
              'generateImageMetadata',
              'generateSitemaps',
            ]
          : []),
        ...(isUsingRemix || isUsingReactRouter
          ? [
              'meta',
              'links',
              'headers',
              'loader',
              'action',
              'clientLoader',
              'clientAction',
              'handle',
              'shouldRevalidate',
            ]
          : []),
      ],
    },
  ]
}

function isPackageExists(packageName: string): boolean {
  let directory = path.resolve(process.cwd())
  const root = path.parse(directory).root

  while (true) {
    if (fs.existsSync(path.join(directory, 'node_modules', packageName, 'package.json'))) return true
    if (directory === root) return false
    directory = path.dirname(directory)
  }
}

function isInEditorEnvironment(): boolean {
  const hasEnvironmentVariable = (name: string): boolean => {
    const value = process.env[name]
    return value !== undefined && value !== ''
  }

  if (
    hasEnvironmentVariable('CI') ||
    hasEnvironmentVariable('GIT_PARAMS') ||
    hasEnvironmentVariable('VSCODE_GIT_COMMAND')
  ) {
    return false
  }
  if (process.env.npm_lifecycle_script?.startsWith('lint-staged')) return false

  return (
    hasEnvironmentVariable('VSCODE_PID') ||
    hasEnvironmentVariable('VSCODE_CWD') ||
    hasEnvironmentVariable('JETBRAINS_IDE') ||
    hasEnvironmentVariable('VIM') ||
    hasEnvironmentVariable('NVIM') ||
    (hasEnvironmentVariable('ZED_ENVIRONMENT') && !hasEnvironmentVariable('ZED_TERM'))
  )
}

function withSeverity(rule: unknown, severity: 'error' | 'warn'): unknown {
  if (!Array.isArray(rule)) return severity
  const ruleOptions = rule as unknown[]
  return [severity, ...ruleOptions.slice(1)]
}

function buildE18eRules(options: OptionsE18e, type: 'app' | 'lib', isInEditor: boolean): DummyRuleMap {
  const rules: DummyRuleMap = {}

  if (options.modernization !== false) Object.assign(rules, e18eModernizationRules)
  if (options.moduleReplacements ?? (type === 'lib' && isInEditor)) Object.assign(rules, e18eModuleReplacementRules)
  if (options.performanceImprovements !== false) Object.assign(rules, e18ePerformanceRules)

  Object.assign(rules, {
    'e18e/prefer-array-at': 'off',
    'e18e/prefer-array-from-map': 'off',
    'e18e/prefer-array-to-reversed': 'off',
    'e18e/prefer-array-to-sorted': 'off',
    'e18e/prefer-array-to-spliced': 'off',
    'e18e/prefer-spread-syntax': 'off',
    ...(type === 'lib' ? {} : { 'e18e/prefer-static-regex': 'off' }),
  })

  return rules
}

function buildRegexpRules(options: OptionsRegExp): DummyRuleMap {
  return Object.fromEntries(
    Object.entries(regexpRules).map(([name, value]) => [
      name,
      options.level === 'warn' && value === 'error' ? 'warn' : value,
    ]),
  )
}

function addDefaultDisables(
  overrides: OxlintOverride[],
  options: { antfu: boolean; comments: boolean; typescript: boolean },
): void {
  overrides.push(
    {
      files: [`**/scripts/${GLOB_SRC}`],
      rules: {
        ...(options.antfu ? { 'antfu/no-top-level-await': 'off' } : {}),
        'no-console': 'off',
        ...(options.typescript ? { 'typescript/explicit-function-return-type': 'off' } : {}),
      },
    },
    {
      files: [`**/cli/${GLOB_SRC}`, `**/cli.${sourceExtensions}`],
      rules: {
        ...(options.antfu ? { 'antfu/no-top-level-await': 'off' } : {}),
        'no-console': 'off',
      },
    },
    {
      files: ['**/bin/**/*', `**/bin.${sourceExtensions}`],
      rules: {
        ...(options.antfu
          ? {
              'antfu/no-import-dist': 'off',
              'antfu/no-import-node-modules-by-path': 'off',
            }
          : {}),
      },
    },
    {
      files: ['**/*.d.{ts,mts,cts}'],
      rules: {
        ...(options.comments ? { 'eslint-comments/no-unlimited-disable': 'off' } : {}),
        'no-unused-vars': 'off',
      },
    },
    {
      files: ['**/*.js', '**/*.cjs'],
      rules: {
        ...(options.typescript ? { 'typescript/no-require-imports': 'off' } : {}),
      },
    },
    {
      files: [`**/*.config.${sourceExtensions}`, `**/*.config.*.${sourceExtensions}`],
      rules: {
        ...(options.antfu ? { 'antfu/no-top-level-await': 'off' } : {}),
        'no-console': 'off',
        ...(options.typescript ? { 'typescript/explicit-function-return-type': 'off' } : {}),
      },
    },
  )
}

export function oxlint(options: OptionsConfig = {}): OxlintConfig {
  const renameRules = options.autoRenamePlugins !== false
  const isInEditor = options.isInEditor ?? isInEditorEnvironment()
  const projectType = options.type ?? 'app'
  const typescriptDetected = isPackageExists('typescript') || isPackageExists('@typescript/native-preview')
  const vueDetected = ['vue', 'nuxt', 'vitepress', '@slidev/cli'].some(isPackageExists)
  const typescript = optionObject<OptionsTypescript>(options.typescript, typescriptDetected)
  const vue = optionObject<OptionsOverrides>(options.vue, vueDetected)
  const node = optionObject<{ jsPlugin?: boolean }>(options.node, true)
  const jsdoc = optionObject<{ jsPlugin?: boolean }>(options.jsdoc, true)
  const unicorn = optionObject<OptionsUnicorn>(options.unicorn, true)
  const test = optionObject<OptionsOverrides>(options.test, true)
  const react = optionObject<{ jsPlugin?: boolean; overrides?: DummyRuleMap }>(options.react, false)
  const nextjs = optionObject<OptionsOverrides>(options.nextjs, false)
  const solid = optionObject<OptionsOverrides>(options.solid, false)
  const angular = optionObject<OptionsOverrides>(options.angular, false)
  const unocss = optionObject<OptionsUnoCSS>(options.unocss, false)
  const jsx = optionObject<{ a11y?: boolean | OptionsJSXA11y }>(options.jsx, true)
  const jsxA11y = jsx === false ? false : optionObject<OptionsJSXA11y>(jsx.a11y, false)
  const e18e = optionObject<OptionsE18e>(options.e18e, true)
  const regexp = optionObject<OptionsRegExp>(options.regexp, true)
  const useAntfuPlugin = options.jsPlugins !== false
  const useCommentsPlugin = options.jsPlugins !== false
  const useE18ePlugin = options.jsPlugins !== false && e18e !== false
  const useNodeExtra = node !== false && options.jsPlugins !== false && node.jsPlugin !== false
  const useUnicornJs = unicorn !== false && unicorn.allRecommended === true

  const plugins = new Set<NativePlugin>(['oxc', ...(options.plugins ?? [])])
  const jsPlugins: ExternalPluginEntry[] = []
  const overrides: OxlintOverride[] = []
  const rootRules: Record<string, unknown> = mergeRules(baseRules, options.javascript?.overrides, renameRules)

  if (isInEditor) {
    rootRules['prefer-const'] = withSeverity(rootRules['prefer-const'], 'warn')
    rootRules['no-unused-vars'] = withSeverity(rootRules['no-unused-vars'], 'warn')
  }

  if (options.imports !== false) {
    plugins.add('import')
    Object.assign(
      rootRules,
      mergeRules(importRules, typeof options.imports === 'object' ? options.imports.overrides : undefined, renameRules),
    )
    if (useAntfuPlugin) Object.assign(rootRules, antfuImportRules)
  }

  if (node !== false) {
    plugins.add('node')
    addOverride(
      overrides,
      [GLOB_SRC],
      useNodeExtra ? { ...nodeRules, ...nodeExtraRules } : nodeRules,
      undefined,
      renameRules,
    )
    if (useNodeExtra) {
      jsPlugins.push(resolvePlugin('node-extra', 'eslint-plugin-n'))
    }
  }

  if (jsdoc !== false) {
    plugins.add('jsdoc')
    const useJsdocExtra = options.jsPlugins !== false && jsdoc.jsPlugin !== false
    addOverride(
      overrides,
      [GLOB_SRC],
      useJsdocExtra ? { ...jsdocRules, ...jsdocExtraRules } : jsdocRules,
      undefined,
      renameRules,
    )
    if (useJsdocExtra) {
      jsPlugins.push(resolvePlugin('jsdoc-extra', 'eslint-plugin-jsdoc'))
    }
  }

  if (unicorn !== false) {
    if (useUnicornJs) {
      if (options.jsPlugins === false)
        throw new Error('[@mzwing/oxc-config] `unicorn.allRecommended` requires JS plugins.')
      jsPlugins.push(resolvePlugin('unicorn-js', 'eslint-plugin-unicorn'))
      const userRules = normalizeRules(unicorn.overrides, renameRules)
      addOverride(
        overrides,
        [GLOB_SRC],
        renameRulePrefix(loadUnicornRecommendedRules(), 'unicorn', 'unicorn-js') ?? {},
        renameRules ? renameRulePrefix(userRules, 'unicorn', 'unicorn-js') : userRules,
        false,
      )
    } else {
      plugins.add('unicorn')
      addOverride(overrides, [GLOB_SRC], unicornRules, unicorn.overrides, renameRules)
    }
  }

  if (typescript !== false) {
    plugins.add('typescript')
    const regularRules = {
      ...typescriptRules,
      ...(projectType === 'lib' ? typescriptLibraryRules : {}),
      ...(isInEditor ? { 'prefer-const': withSeverity(typescriptRules['prefer-const'], 'warn') } : {}),
    }
    addOverride(
      overrides,
      [GLOB_TS, GLOB_TSX, ...(vue === false ? [] : [GLOB_VUE])],
      regularRules,
      typescript.overrides,
      renameRules,
    )
    addOverride(
      overrides,
      typescript.filesTypeAware ?? [GLOB_TS, GLOB_TSX],
      typeAwareRules,
      typescript.overridesTypeAware,
      renameRules,
      typescript.ignoresTypeAware,
    )
    if (typescript.erasableOnly) {
      if (options.jsPlugins === false)
        throw new Error('[@mzwing/oxc-config] `typescript.erasableOnly` requires JS plugins.')
      jsPlugins.push({
        name: 'erasable-syntax-only',
        specifier: import.meta.resolve('eslint-plugin-erasable-syntax-only'),
      })
      addOverride(overrides, [GLOB_TS, GLOB_TSX], erasableSyntaxOnlyRules, undefined, false)
    }
  }

  if (test !== false) {
    plugins.add('vitest')
    addOverride(
      overrides,
      GLOB_TESTS,
      {
        ...testRules,
        'vitest/no-focused-tests': isInEditor ? 'warn' : 'error',
        ...(useAntfuPlugin ? { 'antfu/no-top-level-await': 'off' } : {}),
        ...(useE18ePlugin ? { 'e18e/prefer-static-regex': 'off' } : {}),
        ...(useNodeExtra ? { 'node-extra/prefer-global/process': 'off' } : {}),
        ...(typescript !== false ? { 'typescript/explicit-function-return-type': 'off' } : {}),
      },
      test.overrides,
      renameRules,
    )
  }

  if (jsxA11y !== false) {
    plugins.add('jsx-a11y')
    addOverride(overrides, [GLOB_JSX, GLOB_TSX], jsxA11yRules, jsxA11y.overrides, renameRules)
  }

  if (vue !== false) {
    plugins.add('vue')
    addOverride(
      overrides,
      [GLOB_VUE],
      {
        ...vueRules,
        ...(useAntfuPlugin ? { 'antfu/no-top-level-await': 'off' } : {}),
        ...(useNodeExtra ? { 'node-extra/prefer-global/process': 'off' } : {}),
        ...(typescript !== false ? { 'typescript/explicit-function-return-type': 'off' } : {}),
      },
      vue.overrides,
      renameRules,
    )
  }

  if (react !== false) {
    plugins.add('react')
    const useReactX = options.jsPlugins !== false && react.jsPlugin !== false
    addOverride(
      overrides,
      [GLOB_SRC],
      useReactX
        ? { ...reactRules, 'react/only-export-components': reactRefreshRule(), ...reactXRules }
        : { ...reactRules, 'react/only-export-components': reactRefreshRule() },
      react.overrides,
      renameRules,
    )
    if (useReactX) jsPlugins.push(resolvePlugin('react-x', '@eslint-react/eslint-plugin'))
    if (typescript !== false) {
      addOverride(
        overrides,
        [GLOB_TS, GLOB_TSX],
        {
          'react/no-unknown-property': 'off',
          'react/style-prop-object': 'off',
        },
        undefined,
        false,
      )
    }
  }

  if (nextjs !== false) {
    plugins.add('nextjs')
    addOverride(overrides, [GLOB_SRC], nextjsRules, nextjs.overrides, renameRules)
  }

  if (solid !== false) {
    if (options.jsPlugins === false) throw new Error('[@mzwing/oxc-config] The Solid integration requires JS plugins.')
    jsPlugins.push(resolvePlugin('solid', 'eslint-plugin-solid'))
    addOverride(
      overrides,
      [GLOB_JSX, GLOB_TSX],
      {
        ...solidRules,
        'solid/jsx-no-undef': ['error', { typescriptEnabled: typescript !== false }],
      },
      solid.overrides,
      renameRules,
    )
  }

  if (angular !== false) {
    if (options.jsPlugins === false)
      throw new Error('[@mzwing/oxc-config] The Angular integration requires JS plugins.')
    jsPlugins.push(resolvePlugin('angular', '@angular-eslint/eslint-plugin'))
    addOverride(overrides, [GLOB_TS], angularRules, angular.overrides, renameRules)
  }

  if (unocss !== false) {
    if (options.jsPlugins === false) throw new Error('[@mzwing/oxc-config] The UnoCSS integration requires JS plugins.')
    jsPlugins.push(resolvePlugin('unocss', '@unocss/eslint-plugin'))
    addOverride(
      overrides,
      [GLOB_SRC],
      {
        'unocss/order': 'warn',
        ...(unocss.attributify === false ? {} : { 'unocss/order-attributify': 'warn' }),
        ...(unocss.strict === true ? { 'unocss/blocklist': 'error' } : {}),
      },
      unocss.overrides,
      renameRules,
    )
  }

  if (options.jsPlugins !== false) {
    jsPlugins.push(resolvePlugin('antfu', 'eslint-plugin-antfu'))
    Object.assign(rootRules, antfuRules)
    if (!options.lessOpinionated) {
      rootRules['antfu/curly'] = 'error'
      rootRules['antfu/top-level-function'] = 'error'
    }

    jsPlugins.push(resolvePlugin('eslint-comments', '@eslint-community/eslint-plugin-eslint-comments'))
    Object.assign(rootRules, commentsRules)
    jsPlugins.push(resolvePlugin('command', 'eslint-plugin-command'))
    Object.assign(rootRules, commandRules)

    if (e18e !== false) {
      jsPlugins.push(resolvePlugin('e18e', '@e18e/eslint-plugin'))
      Object.assign(
        rootRules,
        buildE18eRules(e18e, projectType, isInEditor),
        normalizeRules(e18e.overrides, renameRules),
      )
    }
    if (regexp !== false) {
      jsPlugins.push(resolvePlugin('regexp', 'eslint-plugin-regexp'))
      Object.assign(rootRules, buildRegexpRules(regexp), normalizeRules(regexp.overrides, renameRules))
    }
  }
  if (options.lessOpinionated) rootRules.curly = ['error', 'all']

  if (options.jsPlugins === false && (options.additionalJsPlugins?.length ?? 0) > 0)
    throw new Error('[@mzwing/oxc-config] `additionalJsPlugins` cannot be used when `jsPlugins` is false.')
  if (options.additionalJsPlugins) jsPlugins.push(...options.additionalJsPlugins)

  addDefaultDisables(overrides, {
    antfu: useAntfuPlugin,
    comments: useCommentsPlugin,
    typescript: typescript !== false,
  })

  const userRootRules = normalizeRules(options.rules, renameRules)
  const resolvedUserRootRules =
    useUnicornJs && renameRules ? renameRulePrefix(userRootRules, 'unicorn', 'unicorn-js') : userRootRules
  if (resolvedUserRootRules !== undefined) {
    overrides.push({
      files: ['**/*'],
      rules: resolvedUserRootRules,
    })
  }

  return {
    categories: { correctness: 'off' },
    env: {
      browser: true,
      builtin: true,
      es2026: true,
      node: true,
      vue: vue !== false,
    },
    globals: vue === false ? undefined : vueGlobals,
    ignorePatterns: resolveIgnorePatterns(options.ignores, typescript !== false, options.gitignore),
    jsPlugins: jsPlugins.length > 0 ? jsPlugins : undefined,
    options: {
      reportUnusedDisableDirectives: 'error',
      typeAware: typescript !== false,
    },
    overrides,
    plugins: [...plugins],
    rules: Object.assign({}, rootRules, resolvedUserRootRules),
    settings: options.settings,
  }
}
