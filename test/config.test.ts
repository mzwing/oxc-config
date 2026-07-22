import type { OxlintConfig } from 'oxlint'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { afterEach, describe, expect, it } from 'vitest'
import oxlint, { oxfmt } from '../src/index.js'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(async directory => fs.rm(directory, { force: true, recursive: true })),
  )
})

function pluginNames(config: OxlintConfig): string[] {
  return (config.jsPlugins ?? []).map(plugin => (typeof plugin === 'string' ? plugin : plugin.name))
}

function findRule(config: OxlintConfig, name: string): unknown {
  return config.overrides?.find(override => override.rules?.[name] !== undefined)?.rules?.[name]
}

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
    expect(config.sortImports).toMatchObject({ newlinesBetween: false, sortSideEffects: false })
  })

  it('lets native options override defaults while extending ignores', () => {
    const config = oxfmt({
      ignores: ['generated'],
      printWidth: 88,
      singleQuote: false,
      sortImports: { order: 'desc' },
    })

    expect(config.printWidth).toBe(88)
    expect(config.singleQuote).toBe(false)
    expect(config.ignorePatterns).toContain('generated')
    expect(config.sortImports).toMatchObject({ order: 'desc', sortSideEffects: false })
  })

  it('supports functional ignores with replacement semantics', () => {
    const config = oxfmt({
      ignores: originals => {
        expect(originals).toContain('**/node_modules')
        return ['only-this']
      },
    })

    expect(config.ignorePatterns).toEqual(['only-this'])
  })

  it('rejects the native ignorePatterns input in favor of ignores', () => {
    expect(() => oxfmt({ ignorePatterns: ['generated'] } as never)).toThrow(
      'Unsupported `ignorePatterns` option. Use `ignores` instead.',
    )
  })
})

describe('oxlint public behavior', () => {
  it('uses original defaults and resolved built-in integrations', () => {
    const config = oxlint({ gitignore: false, typescript: false })

    expect(config.categories?.correctness).toBe('off')
    expect(config.plugins).toEqual(expect.arrayContaining(['import', 'jsdoc', 'node', 'oxc', 'unicorn', 'vitest']))
    expect(config.plugins).not.toContain('typescript')
    expect(config.rules?.['no-unused-vars']).toEqual(expect.arrayContaining(['error']))
    expect(config.rules?.['antfu/top-level-function']).toBe('error')
    expect(pluginNames(config)).toEqual(
      expect.arrayContaining(['antfu', 'command', 'e18e', 'eslint-comments', 'jsdoc-extra', 'node-extra', 'regexp']),
    )
  })

  it('merges and deduplicates native plugins', () => {
    const config = oxlint({ gitignore: false, plugins: ['oxc', 'promise'], typescript: false })

    expect(config.plugins).toContain('promise')
    expect(config.plugins?.filter(plugin => plugin === 'oxc')).toHaveLength(1)
    expect(config.plugins?.filter(plugin => plugin === 'promise')).toHaveLength(1)
  })

  it('auto-detects TypeScript and Vue from the consumer project', async () => {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'oxc-config-detection-'))
    const originalCwd = process.cwd()
    temporaryDirectories.push(cwd)

    try {
      process.chdir(cwd)
      const plain = oxlint({ gitignore: false, jsPlugins: false })
      expect(plain.plugins).not.toContain('typescript')
      expect(plain.plugins).not.toContain('vue')

      for (const packageName of ['typescript', 'vue', 'vite', 'next']) {
        const packagePath = path.join(cwd, 'node_modules', packageName)
        await fs.mkdir(packagePath, { recursive: true })
        await Promise.all([
          fs.writeFile(path.join(packagePath, 'index.js'), ''),
          fs.writeFile(path.join(packagePath, 'package.json'), JSON.stringify({ main: 'index.js', name: packageName })),
        ])
      }

      const detected = oxlint({ gitignore: false, jsPlugins: false, react: true })
      const refreshRule = findRule(detected, 'react/only-export-components') as [
        string,
        { allowConstantExport: boolean; allowExportNames: string[] },
      ]
      expect(detected.plugins).toEqual(expect.arrayContaining(['typescript', 'vue']))
      expect(refreshRule[1].allowConstantExport).toBe(true)
      expect(refreshRule[1].allowExportNames).toContain('metadata')
    } finally {
      process.chdir(originalCwd)
    }
  })

  it('supports global and integration-specific JS plugin switches', () => {
    const nativeOnly = oxlint({ gitignore: false, jsPlugins: false, typescript: false })
    expect(nativeOnly.jsPlugins).toBeUndefined()
    expect(nativeOnly.plugins).toEqual(expect.arrayContaining(['jsdoc', 'node', 'unicorn', 'vitest']))
    expect(nativeOnly.rules?.['antfu/no-top-level-await']).toBeUndefined()

    const selective = oxlint({
      gitignore: false,
      jsdoc: { jsPlugin: false },
      node: { jsPlugin: false },
      react: { jsPlugin: false },
      typescript: false,
    })
    expect(pluginNames(selective)).not.toEqual(expect.arrayContaining(['jsdoc-extra', 'node-extra', 'react-x']))
    expect(selective.plugins).toEqual(expect.arrayContaining(['jsdoc', 'node', 'react']))
  })

  it('appends additional JS plugins and rejects conflicts', () => {
    const config = oxlint({
      additionalJsPlugins: [{ name: 'custom', specifier: './custom-plugin.js' }],
      gitignore: false,
      rules: { 'custom/example': 'warn' },
      typescript: false,
    })

    expect(pluginNames(config)).toContain('custom')
    expect(config.rules?.['custom/example']).toBe('warn')
    expect(() =>
      oxlint({
        additionalJsPlugins: ['./custom-plugin.js'],
        gitignore: false,
        jsPlugins: false,
        typescript: false,
      }),
    ).toThrow('`additionalJsPlugins` cannot be used')
  })

  it.each(['angular', 'solid', 'unocss'] as const)('rejects %s when JS plugins are disabled', integration => {
    expect(() => oxlint({ [integration]: true, gitignore: false, jsPlugins: false, typescript: false })).toThrow(
      'requires JS plugins',
    )
  })

  it('restores integration overrides and Antfu rule aliases', () => {
    const config = oxlint({
      gitignore: false,
      imports: { overrides: { 'import/no-named-default': 'off' } },
      nextjs: { overrides: { 'next/no-img-element': 'off' } },
      react: { overrides: { 'react/no-forward-ref': 'off' } },
      rules: {
        'ts/no-floating-promises': 'warn',
        'typescript/consistent-type-definitions': 'error',
        'unused-imports/no-unused-imports': 'off',
      },
      test: { overrides: { 'test/no-only-tests': 'off' } },
      typescript: {
        overrides: { 'ts/no-explicit-any': 'error' },
        overridesTypeAware: { 'ts/no-floating-promises': 'off' },
      },
    })

    expect(config.rules?.['typescript/no-floating-promises']).toBe('warn')
    expect(config.rules?.['typescript/consistent-type-definitions']).toBe('error')
    expect(config.rules?.['no-unused-vars']).toBe('off')
    expect(config.rules?.['import/no-named-default']).toBe('off')
    expect(findRule(config, 'typescript/no-explicit-any')).toBe('error')
    expect(findRule(config, 'vitest/no-focused-tests')).toBe('off')
    expect(findRule(config, 'nextjs/no-img-element')).toBe('off')
    expect(findRule(config, 'react-x/no-forward-ref')).toBe('off')
  })

  it('can disable automatic user rule aliases', () => {
    const config = oxlint({
      autoRenamePlugins: false,
      gitignore: false,
      rules: { 'ts/no-floating-promises': 'warn' },
      typescript: { overrides: { 'ts/no-explicit-any': 'off' } },
    })

    expect(config.rules?.['ts/no-floating-promises']).toBe('warn')
    expect(config.rules?.['typescript/no-floating-promises']).toBeUndefined()
    expect(findRule(config, 'ts/no-explicit-any')).toBe('off')

    const unicorn = oxlint({
      autoRenamePlugins: false,
      gitignore: false,
      typescript: false,
      unicorn: { allRecommended: true, overrides: { 'unicorn-js/no-null': 'off' } },
    })
    expect(findRule(unicorn, 'unicorn-js/no-null')).toBe('off')
  })

  it('enables TypeScript and type-aware rules with the default no-any warning', () => {
    const app = oxlint({ gitignore: false, type: 'app', typescript: true })
    const library = oxlint({ gitignore: false, type: 'lib', typescript: true })
    const appTypeScriptRules = app.overrides?.find(
      override => override.rules?.['typescript/no-explicit-any'] !== undefined,
    )?.rules
    const libraryTypeScriptRules = library.overrides?.find(
      override => override.rules?.['typescript/no-explicit-any'] !== undefined,
    )?.rules

    expect(app.options?.typeAware).toBe(true)
    expect(app.plugins).toContain('typescript')
    expect(appTypeScriptRules?.['typescript/no-explicit-any']).toBe('warn')
    expect(findRule(app, 'typescript/no-floating-promises')).toBe('error')
    expect(appTypeScriptRules?.['typescript/explicit-function-return-type']).toBeUndefined()
    expect(libraryTypeScriptRules?.['typescript/explicit-function-return-type']).toEqual(
      expect.arrayContaining(['error']),
    )
  })

  it('supports the validated optional Unicorn and erasable syntax modes', () => {
    const unicorn = oxlint({
      gitignore: false,
      typescript: false,
      unicorn: { allRecommended: true, overrides: { 'unicorn/no-null': 'off' } },
    })
    const erasable = oxlint({ gitignore: false, typescript: { erasableOnly: true } })

    expect(pluginNames(unicorn)).toContain('unicorn-js')
    expect(unicorn.plugins).not.toContain('unicorn')
    expect(findRule(unicorn, 'unicorn-js/no-null')).toBe('off')
    expect(pluginNames(erasable)).toContain('erasable-syntax-only')
    expect(findRule(erasable, 'erasable-syntax-only/enums')).toBe('error')
    expect(() =>
      oxlint({ gitignore: false, jsPlugins: false, typescript: false, unicorn: { allRecommended: true } }),
    ).toThrow('requires JS plugins')
    expect(() => oxlint({ gitignore: false, jsPlugins: false, typescript: { erasableOnly: true } })).toThrow(
      'requires JS plugins',
    )
  })

  it('applies root rules after integration overrides', () => {
    const config = oxlint({
      gitignore: false,
      rules: { 'ts/no-explicit-any': 'off' },
      typescript: { overrides: { 'ts/no-explicit-any': 'error' } },
    })

    expect(config.overrides?.at(-1)).toMatchObject({
      files: ['**/*'],
      rules: { 'typescript/no-explicit-any': 'off' },
    })
  })

  it('restores JSX a11y, e18e groups, regexp levels, and lessOpinionated', () => {
    const config = oxlint({
      e18e: {
        modernization: false,
        moduleReplacements: true,
        performanceImprovements: false,
      },
      gitignore: false,
      jsx: { a11y: { overrides: { 'jsx-a11y/anchor-is-valid': 'off' } } },
      lessOpinionated: true,
      regexp: { level: 'warn' },
      typescript: false,
    })

    expect(config.rules?.['e18e/ban-dependencies']).toBe('error')
    expect(config.rules?.['e18e/prefer-array-fill']).toBeUndefined()
    expect(config.rules?.['regexp/control-character-escape']).toBe('warn')
    expect(config.rules?.curly).toEqual(['error', 'all'])
    expect(config.rules?.['antfu/top-level-function']).toBeUndefined()
    expect(findRule(config, 'jsx-a11y/anchor-is-valid')).toBe('off')
    expect(
      oxlint({ e18e: true, gitignore: false, isInEditor: true, type: 'lib', typescript: false }).rules?.[
        'e18e/ban-dependencies'
      ],
    ).toBe('error')
  })

  it('restores editor severity changes', () => {
    const config = oxlint({ gitignore: false, isInEditor: true, typescript: true })

    expect(config.rules?.['prefer-const']).toEqual(expect.arrayContaining(['warn']))
    expect(config.rules?.['no-unused-vars']).toEqual(expect.arrayContaining(['warn']))
    expect(findRule(config, 'vitest/no-focused-tests')).toBe('warn')
  })

  it('restores the contextual script, CLI, bin, declaration, CommonJS, and config-file disables', () => {
    const config = oxlint({ gitignore: false, typescript: true })
    const findOverride = (file: string) => config.overrides?.find(override => override.files?.includes(file))

    expect(findOverride('**/scripts/**/*.{js,mjs,cjs,jsx,mjsx,cjsx,ts,mts,cts,tsx,mtsx,ctsx}')?.rules).toMatchObject({
      'antfu/no-top-level-await': 'off',
      'no-console': 'off',
      'typescript/explicit-function-return-type': 'off',
    })
    expect(findOverride('**/cli.{js,mjs,cjs,jsx,mjsx,cjsx,ts,mts,cts,tsx,mtsx,ctsx}')?.rules).toMatchObject({
      'antfu/no-top-level-await': 'off',
      'no-console': 'off',
    })
    expect(findOverride('**/bin/**/*')?.rules).toMatchObject({
      'antfu/no-import-dist': 'off',
      'antfu/no-import-node-modules-by-path': 'off',
    })
    expect(findOverride('**/*.d.{ts,mts,cts}')?.rules).toMatchObject({
      'eslint-comments/no-unlimited-disable': 'off',
      'no-unused-vars': 'off',
    })
    expect(findOverride('**/*.cjs')?.rules).toMatchObject({ 'typescript/no-require-imports': 'off' })
    expect(findOverride('**/*.config.{js,mjs,cjs,jsx,mjsx,cjsx,ts,mts,cts,tsx,mtsx,ctsx}')?.rules).toMatchObject({
      'antfu/no-top-level-await': 'off',
      'no-console': 'off',
      'typescript/explicit-function-return-type': 'off',
    })
  })

  it('supports array and functional ignores with original replacement semantics', () => {
    const appended = oxlint({ gitignore: false, ignores: ['generated'], typescript: false })
    expect(appended.ignorePatterns).toEqual(expect.arrayContaining(['generated', '**/*.{ts,mts,cts}']))

    const replaced = oxlint({
      gitignore: false,
      ignores: originals => {
        expect(originals).toContain('**/node_modules')
        expect(originals).toContain('**/*.{ts,mts,cts}')
        return ['only-this']
      },
      typescript: false,
    })
    expect(replaced.ignorePatterns).toEqual(['only-this'])
  })

  it('restores gitignore, recursive ignore, and gitmodule handling', async () => {
    const cwd = path.resolve('.temp/config-gitignore-test')
    temporaryDirectories.push(cwd)
    await fs.mkdir(path.join(cwd, 'packages/example'), { recursive: true })
    await fs.mkdir(path.join(cwd, 'packages/skipped'), { recursive: true })
    await Promise.all([
      fs.writeFile(path.join(cwd, '.gitignore'), 'dist\n!dist/keep\n'),
      fs.writeFile(path.join(cwd, '.gitmodules'), '[submodule "vendor"]\n  path = vendor/pkg\n'),
      fs.writeFile(path.join(cwd, 'packages/example/.gitignore'), 'generated\n'),
      fs.writeFile(path.join(cwd, 'packages/skipped/.gitignore'), 'ignored\n'),
    ])

    const config = oxlint({
      gitignore: { cwd, recursive: true },
      ignores: [],
      typescript: true,
    })

    expect(config.ignorePatterns).toEqual(
      expect.arrayContaining(['dist', '!dist/keep', 'packages/example/generated', 'vendor/pkg/**']),
    )
    expect(() => oxlint({ gitignore: { cwd, files: ['missing'], strict: true }, typescript: true })).toThrow()

    const skipped = oxlint({
      gitignore: { cwd, recursive: { skipDirs: ['skipped'] } },
      typescript: true,
    })
    expect(skipped.ignorePatterns).not.toContain('packages/skipped/ignored')

    const child = path.join(cwd, 'child')
    await fs.mkdir(child)
    expect(() => oxlint({ gitignore: { cwd: child, root: true }, typescript: true })).toThrow()
    expect(() => oxlint({ gitignore: { cwd: child, root: true, strict: false }, typescript: true })).not.toThrow()
    await fs.writeFile(path.join(child, '.gitignore'), 'child-output\n')
    expect(oxlint({ gitignore: { cwd: child, root: true }, typescript: true }).ignorePatterns).toContain('child-output')

    const nestedGitmodules = path.join(cwd, 'metadata/.gitmodules')
    await fs.mkdir(path.dirname(nestedGitmodules))
    await fs.writeFile(nestedGitmodules, '[submodule "explicit"]\n  path = explicit/pkg\n')
    expect(
      oxlint({
        gitignore: { cwd, filesGitModules: ['metadata/.gitmodules'] },
        typescript: true,
      }).ignorePatterns,
    ).toContain('explicit/pkg/**')
  })
})
