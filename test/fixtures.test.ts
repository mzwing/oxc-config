import fs from 'node:fs/promises'
import path from 'node:path'
import { x } from 'tinyexec'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

interface OxlintDiagnostic {
  code: string
  severity: string
}

interface OxlintReport {
  diagnostics: OxlintDiagnostic[]
}

const fixtureRoot = path.resolve('fixtures')
const formatInputRoot = path.join(fixtureRoot, 'format/input')
const formatOutputRoot = path.join(fixtureRoot, 'format/output')
const lintInputRoot = path.join(fixtureRoot, 'lint')
const runtimePath = path.resolve('.temp/fixture-test')

const supportedFormatFixtures = [
  'angular-inline.component.ts',
  'angular.component.html',
  'angular.component.ts',
  'css.css',
  'html.html',
  'javascript.js',
  'jsx.jsx',
  'markdown.md',
  'svelte.svelte',
  'toml.toml',
  'tsconfig.json',
  'tsx.tsx',
  'typescript.ts',
  'vue-ts.vue',
  'vue.vue',
] as const

const customFormatFixtures = ['javascript.js', 'jsx.jsx', 'typescript.ts', 'vue-ts.vue'] as const
const unsupportedFormatFixtures = ['astro.astro', 'svg.svg', 'xml.xml'] as const

beforeAll(async () => {
  await fs.rm(runtimePath, { force: true, recursive: true })
  await fs.mkdir(runtimePath, { recursive: true })
  await Promise.all([
    fs.writeFile(
      path.join(runtimePath, 'oxfmt.config.mjs'),
      "import { oxfmt } from '../../dist/oxfmt.mjs'\nexport default oxfmt({ svelte: true })\n",
    ),
    fs.writeFile(
      path.join(runtimePath, 'oxfmt.custom.config.mjs'),
      "import { oxfmt } from '../../dist/oxfmt.mjs'\nexport default oxfmt({ singleQuote: false, svelte: true, useTabs: true })\n",
    ),
    fs.writeFile(
      path.join(runtimePath, 'oxlint.config.mjs'),
      "import oxlint from '../../dist/index.mjs'\nexport default oxlint()\n",
    ),
    fs.writeFile(
      path.join(runtimePath, 'oxlint.react.config.mjs'),
      "import oxlint from '../../dist/index.mjs'\nexport default oxlint({ react: true })\n",
    ),
    fs.writeFile(
      path.join(runtimePath, 'oxlint.typescript.config.mjs'),
      "import oxlint from '../../dist/index.mjs'\nexport default oxlint({ jsPlugins: false, typescript: true })\n",
    ),
    fs.writeFile(
      path.join(runtimePath, 'oxlint.angular.config.mjs'),
      "import oxlint from '../../dist/index.mjs'\nexport default oxlint({ angular: true })\n",
    ),
    fs.writeFile(
      path.join(runtimePath, 'oxlint.vue.config.mjs'),
      "import oxlint from '../../dist/index.mjs'\nexport default oxlint({ vue: true })\n",
    ),
    fs.writeFile(
      path.join(runtimePath, 'oxlint.a11y.config.mjs'),
      "import oxlint from '../../dist/index.mjs'\nexport default oxlint({ jsx: { a11y: true }, react: true })\n",
    ),
    fs.writeFile(
      path.join(runtimePath, 'oxlint.a11y-disabled.config.mjs'),
      "import oxlint from '../../dist/index.mjs'\nexport default oxlint({ jsx: { a11y: false }, react: true })\n",
    ),
    fs.writeFile(
      path.join(runtimePath, 'oxlint.a11y-override.config.mjs'),
      "import oxlint from '../../dist/index.mjs'\nexport default oxlint({ jsx: { a11y: { overrides: { 'jsx-a11y/anchor-is-valid': 'off' } } }, react: true })\n",
    ),
  ])
})

afterAll(async () => {
  await fs.rm(runtimePath, { force: true, recursive: true })
})

async function formatFixture(name: string, configName: string): Promise<string> {
  const input = await fs.readFile(path.join(formatInputRoot, name), 'utf8')
  const result = await x(
    'oxfmt',
    ['--config', path.join(runtimePath, configName), '--stdin-filepath', path.join(runtimePath, name)],
    { stdin: input },
  )

  expect(result.exitCode, `${name}: ${result.stderr}`).toBe(0)
  return result.stdout
}

async function lintFixture(
  filePath: string,
  configName: string,
  extraArguments: string[] = [],
): Promise<OxlintDiagnostic[]> {
  const result = await x('oxlint', [
    '--format',
    'json',
    '--config',
    path.join(runtimePath, configName),
    ...extraArguments,
    filePath,
  ])
  const report = JSON.parse(result.stdout) as OxlintReport
  return report.diagnostics
}

function expectDiagnostic(diagnostics: OxlintDiagnostic[], code: string, severity: OxlintDiagnostic['severity']): void {
  expect(diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code, severity })]))
}

function a11yDiagnostics(diagnostics: OxlintDiagnostic[]): OxlintDiagnostic[] {
  return diagnostics.filter(diagnostic => diagnostic.code.startsWith('jsx-a11y('))
}

describe('oxfmt fixture corpus', () => {
  it.each(supportedFormatFixtures)('formats %s with the shared defaults', async name => {
    const actual = await formatFixture(name, 'oxfmt.config.mjs')
    const expected = await fs.readFile(path.join(formatOutputRoot, 'default', name), 'utf8')

    expect(actual).toBe(expected)
  })

  it.each(customFormatFixtures)('formats %s with tabs and double quotes', async name => {
    const actual = await formatFixture(name, 'oxfmt.custom.config.mjs')
    const expected = await fs.readFile(path.join(formatOutputRoot, 'tabs-double-quotes', name), 'utf8')

    expect(actual).toBe(expected)
  })

  it.each(unsupportedFormatFixtures)('reports %s as unsupported', async name => {
    const input = await fs.readFile(path.join(formatInputRoot, name), 'utf8')
    const result = await x(
      'oxfmt',
      ['--config', path.join(runtimePath, 'oxfmt.config.mjs'), '--stdin-filepath', path.join(runtimePath, name)],
      { stdin: input },
    )

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('Unsupported file type')
  })
})

describe('oxlint JSX accessibility fixtures', () => {
  it('reports invalid anchor targets when enabled', async () => {
    const diagnostics = a11yDiagnostics(
      await lintFixture(path.join(lintInputRoot, 'jsx-a11y/invalid.jsx'), 'oxlint.a11y.config.mjs'),
    )

    expectDiagnostic(diagnostics, 'jsx-a11y(anchor-is-valid)', 'error')
  })

  it('does not report accessibility diagnostics when disabled', async () => {
    const diagnostics = a11yDiagnostics(
      await lintFixture(path.join(lintInputRoot, 'jsx-a11y/invalid.jsx'), 'oxlint.a11y-disabled.config.mjs'),
    )

    expect(diagnostics).toEqual([])
  })

  it('respects an accessibility rule override', async () => {
    const diagnostics = a11yDiagnostics(
      await lintFixture(path.join(lintInputRoot, 'jsx-a11y/invalid.jsx'), 'oxlint.a11y-override.config.mjs'),
    )

    expect(diagnostics.map(diagnostic => diagnostic.code)).not.toContain('jsx-a11y(anchor-is-valid)')
  })

  it('accepts the valid accessibility sample', async () => {
    const diagnostics = a11yDiagnostics(
      await lintFixture(path.join(lintInputRoot, 'jsx-a11y/valid.jsx'), 'oxlint.a11y.config.mjs'),
    )

    expect(diagnostics).toEqual([])
  })
})

describe('oxlint language fixtures', () => {
  it('checks JavaScript with the default rules', async () => {
    const diagnostics = await lintFixture(path.join(formatInputRoot, 'javascript.js'), 'oxlint.config.mjs')

    expectDiagnostic(diagnostics, 'eslint(no-var)', 'error')
  })

  it('checks JSX with the React rules', async () => {
    const diagnostics = await lintFixture(path.join(lintInputRoot, 'react/invalid.jsx'), 'oxlint.react.config.mjs')

    expectDiagnostic(diagnostics, 'react(no-unknown-property)', 'error')
  })

  it('checks TypeScript with regular and type-aware rules', async () => {
    const diagnostics = await lintFixture(path.join(formatInputRoot, 'typescript.ts'), 'oxlint.typescript.config.mjs', [
      '--tsconfig',
      path.join(formatInputRoot, 'tsconfig.json'),
    ])

    expectDiagnostic(diagnostics, 'eslint(no-var)', 'error')
  })

  it('lets TypeScript handle React DOM properties in TSX', async () => {
    const diagnostics = await lintFixture(path.join(formatInputRoot, 'tsx.tsx'), 'oxlint.react.config.mjs')

    expect(diagnostics.map(diagnostic => diagnostic.code)).not.toContain('react(no-unknown-property)')
  })

  it('checks Angular with its external plugin', async () => {
    const diagnostics = await lintFixture(
      path.join(lintInputRoot, 'angular/invalid.component.ts'),
      'oxlint.angular.config.mjs',
    )

    expectDiagnostic(diagnostics, 'angular(no-empty-lifecycle-method)', 'error')
  })

  it('checks Vue with its native rules', async () => {
    const diagnostics = await lintFixture(path.join(formatInputRoot, 'vue.vue'), 'oxlint.vue.config.mjs')

    expectDiagnostic(diagnostics, 'vue(prefer-import-from-vue)', 'error')
  })
})
