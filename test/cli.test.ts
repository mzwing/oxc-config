import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { x } from 'tinyexec'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { version } from '../package.json'
import { hasUncommittedChanges } from '../src/cli/utils.js'

const cliPath = path.resolve('bin/index.mjs')
const fixturePath = path.resolve('.temp/cli-test')

interface FixturePackageJson {
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
}

async function writeFixture(pkg: Record<string, unknown> = {}): Promise<void> {
  await fs.rm(fixturePath, { force: true, recursive: true })
  await fs.mkdir(path.join(fixturePath, '.vscode'), { recursive: true })
  await Promise.all([
    fs.writeFile(path.join(fixturePath, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`),
    fs.writeFile(path.join(fixturePath, '.eslintignore'), 'lint-output\n'),
    fs.writeFile(path.join(fixturePath, '.prettierignore'), 'format-output\n'),
    fs.writeFile(path.join(fixturePath, '.eslintrc.yml'), ''),
    fs.writeFile(path.join(fixturePath, '.prettierrc'), '{}\n'),
    fs.writeFile(
      path.join(fixturePath, '.vscode/settings.json'),
      '{\n  // Keep this comment\n  "editor.codeActionsOnSave": {\n    "source.fixAll.eslint": "explicit",\n    "custom.action": true\n  }\n}\n',
    ),
  ])
}

async function runCli(args: string[] = []) {
  return x('node', [cliPath, ...args], {
    nodeOptions: {
      cwd: fixturePath,
      env: {
        ...process.env,
        NO_COLOR: '1',
      },
    },
  })
}

beforeEach(async () => {
  await writeFixture()
})
afterAll(async () => {
  await fs.rm(fixturePath, { force: true, recursive: true })
})

describe('cli migration', () => {
  it('does not treat a non-Git directory as a dirty worktree', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'oxc-config-cli-'))

    try {
      expect(hasUncommittedChanges(directory)).toBe(false)
    } finally {
      await fs.rm(directory, { force: true, recursive: true })
    }
  })

  it('creates both configs and updates package.json', async () => {
    const result = await runCli([
      '--yes',
      '--framework',
      'react',
      '--framework',
      'svelte',
      '--typescript',
      '--no-install',
    ])
    const pkg = JSON.parse(await fs.readFile(path.join(fixturePath, 'package.json'), 'utf8')) as FixturePackageJson
    const lintConfig = await fs.readFile(path.join(fixturePath, 'oxlint.config.ts'), 'utf8')
    const formatConfig = await fs.readFile(path.join(fixturePath, 'oxfmt.config.ts'), 'utf8')

    expect(result.exitCode).toBe(0)
    expect(lintConfig).toContain("import oxlint from '@mzwing/oxc-config'")
    expect(lintConfig).toContain('react: true')
    expect(lintConfig).toContain('svelte: true')
    expect(lintConfig).toContain('typescript: true')
    expect(lintConfig).toContain('lint-output')
    expect(formatConfig).toContain('format-output')
    expect(formatConfig).toContain('svelte: true')
    expect(pkg.devDependencies?.['@eslint-react/eslint-plugin']).toBe('^5.9.2')
    expect(pkg.devDependencies?.['@mzwing/oxc-config']).toBe(`^${version}`)
    expect(pkg.devDependencies?.oxfmt).toBe('^0.59.0')
    expect(pkg.devDependencies?.oxlint).toBe('^1.74.0')
    expect(pkg.devDependencies?.['oxlint-tsgolint']).toBe('^0.25.0')
    expect(pkg.devDependencies?.svelte).toBe('^5.0.0')
    expect(pkg.scripts).toMatchObject({
      format: 'oxfmt --write .',
      'format:check': 'oxfmt --check .',
      lint: 'oxlint',
      'lint:fix': 'oxlint --fix',
    })
  })

  it('detects frameworks and preserves JSONC settings', async () => {
    await writeFixture({
      dependencies: { next: '^16.0.0', react: '^19.0.0' },
      devDependencies: { typescript: '^6.0.0' },
    })
    const result = await runCli(['--yes', '--no-install'])
    const lintConfig = await fs.readFile(path.join(fixturePath, 'oxlint.config.ts'), 'utf8')
    const pkg = JSON.parse(await fs.readFile(path.join(fixturePath, 'package.json'), 'utf8')) as FixturePackageJson
    const settings = await fs.readFile(path.join(fixturePath, '.vscode/settings.json'), 'utf8')

    expect(result.exitCode).toBe(0)
    expect(lintConfig).toContain('nextjs: true')
    expect(lintConfig).toContain('react: true')
    expect(lintConfig).toContain('typescript: true')
    expect(pkg.devDependencies?.['oxlint-tsgolint']).toBe('^0.25.0')
    expect(settings).toContain('// Keep this comment')
    expect(settings).toContain('"custom.action": true')
    expect(settings).toContain('"source.fixAll.oxc": "explicit"')
    expect(settings).not.toContain('source.fixAll.eslint')
  })

  it('reports legacy files without deleting them', async () => {
    await Promise.all([
      fs.rm(path.join(fixturePath, '.eslintignore')),
      fs.rm(path.join(fixturePath, '.prettierignore')),
    ])
    const result = await runCli(['--yes', '--no-install'])
    const lintConfig = await fs.readFile(path.join(fixturePath, 'oxlint.config.ts'), 'utf8')
    const formatConfig = await fs.readFile(path.join(fixturePath, 'oxfmt.config.ts'), 'utf8')

    expect(result.stdout).toContain('Review and remove legacy config files after verification')
    expect(lintConfig).toContain('export default oxlint()')
    expect(formatConfig).toContain('export default oxfmt()')
    await expect(fs.stat(path.join(fixturePath, '.eslintrc.yml'))).resolves.toBeDefined()
    await expect(fs.stat(path.join(fixturePath, '.prettierrc'))).resolves.toBeDefined()
  })

  it('refuses to overwrite an existing Oxc config', async () => {
    await fs.writeFile(path.join(fixturePath, 'oxlint.config.ts'), 'export default {}\n')
    const result = await runCli(['--yes', '--no-install'])

    expect(result.exitCode).toBe(1)
    expect(`${result.stdout}\n${result.stderr}`).toContain('Refusing to overwrite existing config')
  })
})
