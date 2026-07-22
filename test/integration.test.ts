import fs from 'node:fs/promises'
import path from 'node:path'
import { x } from 'tinyexec'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const fixturePath = path.resolve('.temp/integration-test')

beforeAll(async () => {
  await fs.rm(fixturePath, { force: true, recursive: true })
  await fs.mkdir(fixturePath, { recursive: true })
  await Promise.all([
    fs.writeFile(
      path.join(fixturePath, 'oxlint.config.mjs'),
      "import oxlint from '../../dist/index.mjs'\nexport default oxlint()\n",
    ),
    fs.writeFile(
      path.join(fixturePath, 'oxlint.frameworks.config.mjs'),
      "import oxlint from '../../dist/index.mjs'\nexport default oxlint({ angular: true, react: true, solid: true, unocss: true })\n",
    ),
    fs.writeFile(
      path.join(fixturePath, 'oxlint.typed-react.config.mjs'),
      "import oxlint from '../../dist/index.mjs'\nexport default oxlint({ react: true, typescript: true })\n",
    ),
    fs.writeFile(
      path.join(fixturePath, 'tsconfig.json'),
      JSON.stringify(
        { compilerOptions: { jsx: 'preserve', strict: true, target: 'ESNext' }, include: ['*.ts', '*.tsx'] },
        null,
        2,
      ),
    ),
  ])
})

afterAll(async () => {
  await fs.rm(fixturePath, { force: true, recursive: true })
})

describe('published-tool integration', () => {
  it('loads absolute JS plugins and safe-fixes unused imports', async () => {
    const file = path.join(fixturePath, 'unused.ts')
    await fs.writeFile(file, "import { readFile } from 'node:fs/promises'\n\nexport const answer = 42\n")

    const result = await x('oxlint', ['--config', path.join(fixturePath, 'oxlint.config.mjs'), '--fix', file])
    const output = await fs.readFile(file, 'utf8')

    expect(result.exitCode).toBe(0)
    expect(output).not.toContain('readFile')
  })

  it('runs semantic JSDoc and Node fallback rules', async () => {
    const file = path.join(fixturePath, 'plugin-fallbacks.js')
    await fs.writeFile(
      file,
      '/**\n * Greet someone.\n * @param {string} wrong - The name.\n */\nexport function greet(name) { return new Buffer(name).toString() }\n',
    )

    const result = await x('oxlint', ['--config', path.join(fixturePath, 'oxlint.config.mjs'), file])
    const output = `${result.stdout}\n${result.stderr}`

    expect(result.exitCode).toBe(1)
    expect(output).toContain('jsdoc-extra(check-param-names)')
    expect(output).toContain('node-extra(no-deprecated-api)')
  })

  it('loads every optional framework JS plugin through Oxlint', async () => {
    const tsFile = path.join(fixturePath, 'framework.ts')
    const tsxFile = path.join(fixturePath, 'framework.tsx')
    await Promise.all([
      fs.writeFile(tsFile, 'export const answer = 42\n'),
      fs.writeFile(tsxFile, 'export const View = () => <div />\n'),
    ])

    const result = await x('oxlint', [
      '--config',
      path.join(fixturePath, 'oxlint.frameworks.config.mjs'),
      tsFile,
      tsxFile,
    ])

    expect(result.exitCode, `stdout:\n${result.stdout}\n\nstderr:\n${result.stderr}`).toBe(0)
  })

  it('runs type-aware rules together with the React integration', async () => {
    const file = path.join(fixturePath, 'typed-react.tsx')
    await fs.writeFile(
      file,
      'async function work() { return 1 }\nexport const View = () => <button type="button">Run</button>\nwork()\n',
    )

    const result = await x('oxlint', [
      '--config',
      path.join(fixturePath, 'oxlint.typed-react.config.mjs'),
      '--tsconfig',
      path.join(fixturePath, 'tsconfig.json'),
      file,
    ])

    expect(result.exitCode, `stdout:\n${result.stdout}\n\nstderr:\n${result.stderr}`).toBe(1)
    expect(`${result.stdout}\n${result.stderr}`).toContain('typescript(no-floating-promises)')
  })
})
