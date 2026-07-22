import type { FeatureOptions, JsFeatureOptions, OxlintOptions } from '../src/types.js'
import { describe, expect, expectTypeOf, it } from 'vitest'
import oxlint, { oxfmt } from '../src/index.js'

describe('oxfmt', () => {
  it('preserves the intentional Antfu-inspired defaults', () => {
    const config = oxfmt()

    expect(config).toMatchObject({
      arrowParens: 'avoid',
      jsxSingleQuote: false,
      printWidth: 120,
      proseWrap: 'preserve',
      semi: false,
      singleQuote: true,
      sortPackageJson: true,
      tabWidth: 2,
      trailingComma: 'all',
      useTabs: false,
    })
    expect(config.sortImports).toMatchObject({
      newlinesBetween: false,
      sortSideEffects: false,
    })
  })

  it('lets native options override defaults while extending ignores', () => {
    const config = oxfmt({
      ignorePatterns: ['generated'],
      printWidth: 88,
      singleQuote: false,
      sortImports: { order: 'desc' },
    })

    expect(config.printWidth).toBe(88)
    expect(config.singleQuote).toBe(false)
    expect(config.ignorePatterns).toContain('generated')
    expect(config.sortImports).toMatchObject({
      order: 'desc',
      sortSideEffects: false,
    })
  })
})

describe('oxlint', () => {
  it('exposes JS plugin switches only for hybrid native integrations', () => {
    expectTypeOf<OxlintOptions['jsPlugins']>().toEqualTypeOf<boolean | undefined>()
    expectTypeOf<Exclude<OxlintOptions['angular'], boolean | undefined>>().toEqualTypeOf<FeatureOptions>()
    expectTypeOf<Exclude<OxlintOptions['solid'], boolean | undefined>>().toEqualTypeOf<FeatureOptions>()
    expectTypeOf<Exclude<OxlintOptions['jsdoc'], boolean | undefined>>().toEqualTypeOf<JsFeatureOptions>()
    expectTypeOf<Exclude<OxlintOptions['node'], boolean | undefined>>().toEqualTypeOf<JsFeatureOptions>()
    expectTypeOf<Exclude<OxlintOptions['react'], boolean | undefined>>().toEqualTypeOf<JsFeatureOptions>()
  })

  it('uses explicit native rules and resolved default JS plugins', () => {
    const config = oxlint()
    const jsPlugins = config.jsPlugins ?? []

    expect(config.categories?.correctness).toBe('off')
    expect(config.plugins).toEqual(expect.arrayContaining(['import', 'jsdoc', 'node', 'oxc', 'unicorn', 'vitest']))
    expect(config.plugins).not.toContain('typescript')
    expect(config.rules?.['no-unused-vars']).toEqual(expect.arrayContaining(['error']))
    expect(Object.keys(config.rules ?? {})).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/^style\//), expect.stringMatching(/^format\//)]),
    )
    expect(jsPlugins.map(plugin => (typeof plugin === 'string' ? plugin : plugin.name))).toEqual(
      expect.arrayContaining(['antfu', 'command', 'e18e', 'eslint-comments', 'jsdoc-extra', 'node-extra', 'regexp']),
    )
    expect(jsPlugins.every(plugin => typeof plugin === 'string' || plugin.specifier.startsWith('file:'))).toBe(true)
  })

  it('supports a native-only mode', () => {
    const config = oxlint({ jsPlugins: false })

    expect(config.jsPlugins).toBeUndefined()
    expect(config.rules?.['regexp/no-empty-capturing-group']).toBeUndefined()
    expect(config.rules?.['no-unused-vars']).toBeDefined()
  })

  it('can disable JS supplements without disabling their native integrations', () => {
    const config = oxlint({
      jsdoc: { jsPlugin: false },
      node: { jsPlugin: false },
      react: { jsPlugin: false },
    })
    const pluginNames = (config.jsPlugins ?? []).map(plugin => (typeof plugin === 'string' ? plugin : plugin.name))
    const allRules = (config.overrides ?? []).flatMap(override => Object.keys(override.rules ?? {}))

    expect(config.plugins).toEqual(expect.arrayContaining(['jsdoc', 'node', 'react']))
    expect(pluginNames).not.toContain('jsdoc-extra')
    expect(pluginNames).not.toContain('node-extra')
    expect(pluginNames).not.toContain('react-x')
    expect(allRules).toEqual(
      expect.arrayContaining(['jsdoc/check-access', 'node/handle-callback-err', 'react/rules-of-hooks']),
    )
    expect(allRules).not.toContain('react-x/static-components')
  })

  it('merges additional native plugins with the shared defaults', () => {
    const config = oxlint({ plugins: ['promise'] })

    expect(config.plugins).toEqual(expect.arrayContaining(['oxc', 'promise']))
  })

  it.each(['angular', 'solid', 'unocss'] as const)('rejects %s when JS plugins are disabled', integration => {
    expect(() => oxlint({ [integration]: true, jsPlugins: false })).toThrow('requires JS plugins')
  })

  it('rejects additional JS plugins when JS plugins are disabled', () => {
    expect(() => oxlint({ additionalJsPlugins: ['custom-plugin'], jsPlugins: false })).toThrow(
      '`additionalJsPlugins` cannot be used',
    )
  })

  it('adds optional framework integrations and user overrides last', () => {
    const config = oxlint({
      nextjs: true,
      react: true,
      rules: { 'no-console': 'off' },
      solid: true,
      vue: true,
    })
    const allRules = (config.overrides ?? []).flatMap(override => Object.keys(override.rules ?? {}))
    const pluginNames = (config.jsPlugins ?? []).map(plugin => (typeof plugin === 'string' ? plugin : plugin.name))

    expect(config.rules?.['no-console']).toBe('off')
    expect(config.plugins).toEqual(expect.arrayContaining(['nextjs', 'react', 'vue']))
    expect(pluginNames).toEqual(expect.arrayContaining(['react-x', 'solid']))
    expect(allRules).toEqual(
      expect.arrayContaining([
        'nextjs/no-img-element',
        'react/rules-of-hooks',
        'react-x/static-components',
        'solid/reactivity',
        'vue/no-dupe-keys',
      ]),
    )
  })

  it('accepts Antfu rule aliases and returns canonical Oxlint rule names', () => {
    const config = oxlint({
      extends: [
        {
          overrides: [{ files: ['extended.ts'], rules: { 'test/no-only-tests': 'off' } }],
          rules: { 'ts/ban-ts-comment': 'warn' },
        },
      ],
      nextjs: { rules: { 'next/no-img-element': 'off' } },
      overrides: [{ files: ['legacy.ts'], rules: { 'ts/consistent-type-imports': 'off' } }],
      react: { rules: { 'react/no-forward-ref': 'off' } },
      rules: {
        'ts/consistent-type-definitions': 'off',
        'ts/no-floating-promises': 'warn',
        'typescript/consistent-type-definitions': 'error',
        'unused-imports/no-unused-imports': 'off',
      },
      test: { rules: { 'test/no-only-tests': 'off' } },
      typescript: { rules: { 'ts/no-explicit-any': 'off', 'ts/no-namespace': 'off' } },
    })
    const allOverrides = config.overrides ?? []
    const findRule = (name: string) =>
      allOverrides.find(override => override.rules?.[name] !== undefined)?.rules?.[name]

    expect(config.rules?.['typescript/no-floating-promises']).toBe('warn')
    expect(config.rules?.['typescript/consistent-type-definitions']).toBe('error')
    expect(config.rules?.['no-unused-vars']).toBe('off')
    expect(config.rules?.['ts/no-floating-promises']).toBeUndefined()
    expect(findRule('typescript/no-explicit-any')).toBe('off')
    expect(findRule('typescript/no-namespace')).toBe('off')
    expect(findRule('vitest/no-focused-tests')).toBe('off')
    expect(findRule('nextjs/no-img-element')).toBe('off')
    expect(findRule('react-x/no-forward-ref')).toBe('off')
    expect(
      allOverrides.find(override => override.files.includes('legacy.ts'))?.rules?.[
        'typescript/consistent-type-imports'
      ],
    ).toBe('off')
    expect(config.extends?.[0].rules?.['typescript/ban-ts-comment']).toBe('warn')
    expect(config.extends?.[0].overrides?.[0].rules?.['vitest/no-focused-tests']).toBe('off')
  })

  it('enables TypeScript rules and the type-aware engine together', () => {
    const normal = oxlint()
    const typed = oxlint({ typescript: true })
    expect(normal.options?.typeAware).toBe(false)
    expect(normal.rules?.['typescript/no-floating-promises']).toBeUndefined()
    expect(normal.plugins).not.toContain('typescript')
    expect(typed.options?.typeAware).toBe(true)
    expect(typed.rules?.['typescript/no-floating-promises']).toBe('error')
    expect(typed.plugins).toContain('typescript')
    expect(
      typed.overrides?.find(override => override.rules?.['typescript/no-explicit-any'] !== undefined)?.rules?.[
        'typescript/no-explicit-any'
      ],
    ).toBe('warn')
  })
})
