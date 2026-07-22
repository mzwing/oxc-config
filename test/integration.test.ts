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
      "import oxlint from '../../dist/index.mjs'\nexport default oxlint({ angular: true, react: true, solid: true, typescript: { overridesTypeAware: { 'ts/no-unsafe-return': 'off' } }, unocss: true })\n",
    ),
    fs.writeFile(
      path.join(fixturePath, 'oxlint.typed-react.config.mjs'),
      "import oxlint from '../../dist/index.mjs'\nexport default oxlint({ react: true, typescript: true })\n",
    ),
    fs.writeFile(
      path.join(fixturePath, 'oxlint.unicorn.config.mjs'),
      "import oxlint from '../../dist/index.mjs'\nexport default oxlint({ typescript: false, unicorn: { allRecommended: true } })\n",
    ),
    fs.writeFile(
      path.join(fixturePath, 'oxlint.erasable.config.mjs'),
      "import oxlint from '../../dist/index.mjs'\nexport default oxlint({ typescript: { erasableOnly: true, overridesTypeAware: { 'ts/no-unsafe-assignment': 'off' } } })\n",
    ),
    fs.writeFile(
      path.join(fixturePath, 'oxlint.root-rules.config.mjs'),
      "import oxlint from '../../dist/index.mjs'\nexport default oxlint({ rules: { 'ts/no-explicit-any': 'off' }, typescript: { overrides: { 'ts/no-explicit-any': 'error' } } })\n",
    ),
    fs.writeFile(
      path.join(fixturePath, 'custom-plugin.mjs'),
      "export default { rules: { 'no-answer': { create(context) { return { Literal(node) { if (node.value === 42) context.report({ node, message: 'Avoid the answer.' }) } } }, meta: { schema: [] } } } }\n",
    ),
    fs.writeFile(
      path.join(fixturePath, 'oxlint.additional-plugin.config.mjs'),
      "import oxlint from '../../dist/index.mjs'\nconst specifier = new URL('./custom-plugin.mjs', import.meta.url).href\nexport default oxlint({ additionalJsPlugins: [{ name: 'custom', specifier }], rules: { 'custom/no-answer': 'error' }, typescript: false })\n",
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

  it('executes every Unicorn recommended rule through its non-reserved alias', async () => {
    const file = path.join(fixturePath, 'unicorn.js')
    await fs.writeFile(file, 'export const value = null\n')

    const result = await x('oxlint', ['--config', path.join(fixturePath, 'oxlint.unicorn.config.mjs'), file])

    expect(result.exitCode, `stdout:\n${result.stdout}\n\nstderr:\n${result.stderr}`).toBe(1)
    expect(`${result.stdout}\n${result.stderr}`).toContain('unicorn-js(no-null)')
  })

  it('executes the erasable syntax plugin on TypeScript', async () => {
    const file = path.join(fixturePath, 'erasable.ts')
    await fs.writeFile(file, 'export enum Direction { Left, Right }\n')

    const result = await x('oxlint', [
      '--config',
      path.join(fixturePath, 'oxlint.erasable.config.mjs'),
      '--tsconfig',
      path.join(fixturePath, 'tsconfig.json'),
      file,
    ])

    expect(result.exitCode, `stdout:\n${result.stdout}\n\nstderr:\n${result.stderr}`).toBe(1)
    expect(`${result.stdout}\n${result.stderr}`).toContain('erasable-syntax-only(enums)')
  })

  it('executes additional JS plugins and keeps root rules last', async () => {
    const customFile = path.join(fixturePath, 'custom.js')
    const typedFile = path.join(fixturePath, 'root-rules.ts')
    await Promise.all([
      fs.writeFile(customFile, 'export const answer = 42\n'),
      fs.writeFile(typedFile, 'export const value: any = 1\n'),
    ])

    const custom = await x('oxlint', [
      '--config',
      path.join(fixturePath, 'oxlint.additional-plugin.config.mjs'),
      customFile,
    ])
    const typed = await x('oxlint', [
      '--config',
      path.join(fixturePath, 'oxlint.root-rules.config.mjs'),
      '--tsconfig',
      path.join(fixturePath, 'tsconfig.json'),
      typedFile,
    ])

    expect(custom.exitCode, `stdout:\n${custom.stdout}\n\nstderr:\n${custom.stderr}`).toBe(1)
    expect(`${custom.stdout}\n${custom.stderr}`).toContain('custom(no-answer)')
    expect(`${typed.stdout}\n${typed.stderr}`).not.toContain('typescript(no-explicit-any)')
  })
})
