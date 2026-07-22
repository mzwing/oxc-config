import type { ExternalPluginEntry, OptionsConfig } from '../src/types.js'
import { expect, it } from 'vitest'
import defaultOxlint, { oxfmt, oxlint } from '../src/index.js'

function verifyPublicTypes(): void {
  const plugin: ExternalPluginEntry = { name: 'custom', specifier: './plugin.js' }
  const options: OptionsConfig = {
    additionalJsPlugins: [plugin],
    angular: { overrides: { 'angular/prefer-inject': 'off' } },
    autoRenamePlugins: true,
    e18e: { modernization: false, overrides: { 'e18e/prefer-includes': 'off' } },
    gitignore: { recursive: { skipDirs: ['vendor'] }, strict: false },
    ignores: originals => [...originals, 'generated'],
    imports: { overrides: { 'import/no-duplicates': 'off' } },
    isInEditor: false,
    javascript: { overrides: { eqeqeq: 'warn' } },
    jsPlugins: true,
    jsdoc: { jsPlugin: false },
    jsx: { a11y: { overrides: { 'jsx-a11y/alt-text': 'warn' } } },
    lessOpinionated: false,
    nextjs: { overrides: { 'next/no-img-element': 'off' } },
    node: { jsPlugin: false },
    plugins: ['promise'],
    react: { jsPlugin: false, overrides: { 'react/no-forward-ref': 'off' } },
    regexp: { level: 'warn', overrides: { 'regexp/no-empty-group': 'off' } },
    rules: { 'ts/no-explicit-any': 'off' },
    settings: { react: { version: 'detect' } },
    solid: { overrides: { 'solid/reactivity': 'warn' } },
    test: { overrides: { 'test/no-only-tests': 'off' } },
    type: 'lib',
    typescript: {
      erasableOnly: true,
      filesTypeAware: ['src/**/*.ts'],
      ignoresTypeAware: ['src/generated/**'],
      overrides: { 'ts/no-explicit-any': 'off' },
      overridesTypeAware: { 'ts/no-floating-promises': 'warn' },
    },
    unicorn: { overrides: { 'unicorn/error-message': 'off' } },
    unocss: { attributify: false, overrides: { 'unocss/order': 'off' }, strict: true },
    vue: { overrides: { 'vue/no-dupe-keys': 'error' } },
  }
  oxlint(options)
  defaultOxlint(options)
  oxfmt({ ignores: ['generated'] })
  oxfmt({ ignores: originals => [...originals, 'generated'] })
  // @ts-expect-error The factory exposes ignores instead of Oxfmt's native key.
  oxfmt({ ignorePatterns: ['generated'] })
  // @ts-expect-error Oxfmt ignores must be an array of strings or a matching callback.
  oxfmt({ ignores: 'generated' })
  // @ts-expect-error Oxfmt ignore arrays contain only strings.
  oxfmt({ ignores: ['generated', 1] })

  // @ts-expect-error Temporary native categories are not part of the public factory.
  oxlint({ categories: {} })
  // @ts-expect-error Temporary native environments are not part of the public factory.
  oxlint({ env: {} })
  // @ts-expect-error Temporary native extends are not part of the public factory.
  oxlint({ extends: [] })
  // @ts-expect-error Temporary native globals are not part of the public factory.
  oxlint({ globals: {} })
  // @ts-expect-error Oxlint-native options are not part of the public factory.
  oxlint({ ignorePatterns: [] })
  // @ts-expect-error Temporary native linter options are not part of the public factory.
  oxlint({ options: {} })
  // @ts-expect-error The deprecated top-level integration overrides are not restored.
  oxlint({ overrides: [] })
  // @ts-expect-error The temporary Antfu plugin switch is replaced by jsPlugins.
  oxlint({ antfu: false })
  // @ts-expect-error The temporary command plugin switch is replaced by jsPlugins.
  oxlint({ command: false })
  // @ts-expect-error The temporary comments plugin switch is replaced by jsPlugins.
  oxlint({ comments: false })
  // @ts-expect-error JSX accessibility remains nested under jsx.
  oxlint({ jsxA11y: true })
  // @ts-expect-error Generic feature rules were a temporary 0.1.x API.
  oxlint({ test: { rules: {} } })
  // @ts-expect-error Node objects only add the approved JS plugin switch.
  oxlint({ node: { overrides: {} } })
  // @ts-expect-error JSDoc objects only add the approved JS plugin switch.
  oxlint({ jsdoc: { overrides: {} } })
  // @ts-expect-error React retains overrides but does not expose generic files.
  oxlint({ react: { files: [] } })
  // @ts-expect-error Vue parser-dependent options are not exposed.
  oxlint({ vue: { a11y: true } })
  // @ts-expect-error Vue SFC processors cannot be represented by Oxlint.
  oxlint({ vue: { sfcBlocks: true } })
  // @ts-expect-error Vue parser-version options cannot be represented by Oxlint.
  oxlint({ vue: { vueVersion: 2 } })
  // @ts-expect-error TypeScript parser options cannot be represented by Oxlint.
  oxlint({ typescript: { parserOptions: {} } })
  // @ts-expect-error Direct tsconfig paths cannot be represented by Oxlint config.
  oxlint({ typescript: { tsconfigPath: './tsconfig.json' } })
  // @ts-expect-error Zero-coverage integrations are not exposed by the Oxlint factory.
  oxlint({ astro: true })
  // @ts-expect-error Component extensions require parser and processor support.
  oxlint({ componentExts: ['vue'] })
  // @ts-expect-error JSONC semantic linting has no Oxlint coverage.
  oxlint({ jsonc: true })
  // @ts-expect-error Markdown semantic linting has no Oxlint coverage.
  oxlint({ markdown: true })
  // @ts-expect-error pnpm semantic linting has no Oxlint coverage.
  oxlint({ pnpm: true })
  // @ts-expect-error Svelte linting has no Oxlint coverage.
  oxlint({ svelte: true })
  // @ts-expect-error TOML semantic linting has no Oxlint coverage.
  oxlint({ toml: true })
  // @ts-expect-error YAML semantic linting has no Oxlint coverage.
  oxlint({ yaml: true })
  // @ts-expect-error Formatting is owned by oxfmt.
  oxlint({ formatters: true })
  // @ts-expect-error Import sorting is owned by oxfmt.
  oxlint({ perfectionist: true })
  // @ts-expect-error Stylistic formatting is owned by oxfmt.
  oxlint({ stylistic: true })
  // @ts-expect-error Boolean options do not accept strings.
  oxlint({ autoRenamePlugins: 'yes' })
  // @ts-expect-error Integration overrides must be rule maps.
  oxlint({ imports: { overrides: true } })
  // @ts-expect-error Type-aware file patterns must be arrays.
  oxlint({ typescript: { filesTypeAware: 'src' } })
  // @ts-expect-error Ignore arrays contain only strings.
  oxlint({ ignores: ['generated', 1] })
  // @ts-expect-error Named JS plugins require a specifier.
  oxlint({ additionalJsPlugins: [{ name: 'custom' }] })
}

void verifyPublicTypes

it('typechecks the public API contract', () => {
  expect(verifyPublicTypes).toBeTypeOf('function')
})
