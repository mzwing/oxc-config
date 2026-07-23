import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { x } from 'tinyexec'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

interface KnipIssue {
  dependencies?: { name: string }[]
  devDependencies?: { name: string }[]
  unlisted?: { name: string }[]
}

interface KnipReport {
  issues: KnipIssue[]
}

const fixturePath = path.resolve('.temp/consumer-test')
const packageArchivePath = path.resolve('oxc-config-test.tgz')
const packageInstallPath = path.join(fixturePath, 'node_modules/@mzwing/oxc-config')
const configPath = path.join(fixturePath, 'oxlint.config.ts')

function runInConsumer(command: string, arguments_: string[]) {
  return x(command, arguments_, {
    nodeOptions: {
      cwd: fixturePath,
      env: { ...process.env, CI: 'true' },
    },
  })
}

async function writeOxlintConfig(includeAdditionalPlugin: boolean): Promise<void> {
  const additionalPlugin = includeAdditionalPlugin
    ? `const specifier = import.meta.resolve('eslint-plugin-erasable-syntax-only')
const additionalJsPlugins = [{ name: 'consumer-extra', specifier }]
`
    : 'const additionalJsPlugins = []\n'

  await fs.writeFile(
    configPath,
    `import oxlint from '@mzwing/oxc-config'
${additionalPlugin}export default oxlint({ additionalJsPlugins, typescript: false })
`,
  )
}

async function linkPackage(packageName: string): Promise<void> {
  const segments = packageName.split('/')
  const source = path.resolve('node_modules', ...segments)
  const destination = path.join(fixturePath, 'node_modules', ...segments)

  await fs.mkdir(path.dirname(destination), { recursive: true })
  await fs.symlink(source, destination, process.platform === 'win32' ? 'junction' : 'dir')
}

beforeAll(async () => {
  await Promise.all([fs.rm(fixturePath, { force: true, recursive: true }), fs.rm(packageArchivePath, { force: true })])

  const pack = await x('pnpm', ['--config.ignore-scripts=true', 'pack', '--out', packageArchivePath])
  expect(pack.exitCode, `stdout:\n${pack.stdout}\n\nstderr:\n${pack.stderr}`).toBe(0)

  await fs.mkdir(packageInstallPath, { recursive: true })

  const unpack = await x('tar', ['-xzf', packageArchivePath, '--strip-components=1', '-C', packageInstallPath])
  expect(unpack.exitCode, unpack.stderr).toBe(0)

  const rootPackage = JSON.parse(await fs.readFile(path.resolve('package.json'), 'utf8')) as {
    dependencies: Record<string, string>
    devDependencies: Record<string, string>
    version: string
  }
  const installedPackages = [...Object.keys(rootPackage.dependencies), ...Object.keys(rootPackage.devDependencies)]
  await Promise.all(installedPackages.map(linkPackage))

  await Promise.all([
    fs.writeFile(
      path.join(fixturePath, 'package.json'),
      `${JSON.stringify(
        {
          name: 'oxc-config-consumer-test',
          private: true,
          type: 'module',
          scripts: {
            format: 'oxfmt --check .',
            knip: 'knip',
            lint: 'oxlint',
          },
          devDependencies: {
            '@mzwing/oxc-config': rootPackage.version,
            'eslint-plugin-erasable-syntax-only': rootPackage.dependencies['eslint-plugin-erasable-syntax-only'],
            knip: rootPackage.devDependencies.knip,
            oxfmt: rootPackage.devDependencies.oxfmt,
            oxlint: rootPackage.devDependencies.oxlint,
          },
        },
        null,
        2,
      )}\n`,
    ),
    fs.writeFile(path.join(fixturePath, 'index.js'), 'export const answer = 42\n'),
    writeOxlintConfig(true),
  ])
})

afterAll(async () => {
  await Promise.all([fs.rm(fixturePath, { force: true, recursive: true }), fs.rm(packageArchivePath, { force: true })])
})

describe('packed consumer integration', () => {
  it('attributes built-in plugins to the shared package and keeps consumer plugins visible to Knip', async () => {
    const lint = await runInConsumer('oxlint', ['--config', configPath, 'index.js'])
    expect(lint.exitCode, `stdout:\n${lint.stdout}\n\nstderr:\n${lint.stderr}`).toBe(0)

    const used = await runInConsumer('knip', ['--reporter', 'json'])
    expect(used.exitCode, `stdout:\n${used.stdout}\n\nstderr:\n${used.stderr}`).toBe(0)
    expect(JSON.parse(used.stdout) as KnipReport).toEqual({ issues: [] })

    await writeOxlintConfig(false)

    const unused = await runInConsumer('knip', ['--reporter', 'json'])
    const report = JSON.parse(unused.stdout) as KnipReport
    const dependencyNames = report.issues.flatMap(issue => [
      ...(issue.dependencies ?? []),
      ...(issue.devDependencies ?? []),
      ...(issue.unlisted ?? []),
    ])

    expect(unused.exitCode).toBe(1)
    expect(report.issues).toHaveLength(1)
    expect(dependencyNames.map(dependency => dependency.name)).toEqual(['eslint-plugin-erasable-syntax-only'])
  }, 60_000)
})
