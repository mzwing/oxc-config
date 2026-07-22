import type { MigrationOptions } from '../types.js'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import * as p from '@clack/prompts'
import c from 'ansis'
import parse from 'parse-gitignore'

async function readIgnorePatterns(filePath: string): Promise<string[]> {
  if (!fs.existsSync(filePath)) return []

  const content = await fsp.readFile(filePath, 'utf8')
  const patterns: string[] = []

  for (const glob of parse(content).globs()) {
    if (glob.type === 'ignore') patterns.push(...glob.patterns)
    else if (glob.type === 'unignore') patterns.push(...glob.patterns.map((pattern: string) => `!${pattern}`))
  }

  return patterns
}

function renderOptions(entries: [string, unknown][]): string {
  if (!entries.length) return ''

  return `${entries.map(([key, value]) => `  ${key}: ${JSON.stringify(value)},`).join('\n')}\n`
}

function renderFactory(name: 'oxfmt' | 'oxlint', entries: [string, unknown][]): string {
  return entries.length ? `${name}({\n${renderOptions(entries)}})` : `${name}()`
}

export async function updateConfigFiles(result: MigrationOptions): Promise<void> {
  const cwd = process.cwd()
  const lintIgnorePath = path.join(cwd, '.eslintignore')
  const formatIgnorePath = path.join(cwd, '.prettierignore')
  const lintIgnores = await readIgnorePatterns(lintIgnorePath)
  const formatIgnores = await readIgnorePatterns(formatIgnorePath)

  const lintOptions: [string, unknown][] = result.frameworks.map(framework => [framework, true])
  if (result.typescript) lintOptions.push(['typescript', true])
  if (lintIgnores.length) lintOptions.push(['ignorePatterns', lintIgnores])

  const formatOptions: [string, unknown][] = []
  if (result.frameworks.includes('svelte')) formatOptions.push(['svelte', true])
  if (formatIgnores.length) formatOptions.push(['ignorePatterns', formatIgnores])

  const lintConfig = `import oxlint from '@mzwing/oxc-config'\n\nexport default ${renderFactory('oxlint', lintOptions)}\n`
  const formatConfig = `import { oxfmt } from '@mzwing/oxc-config'\n\nexport default ${renderFactory('oxfmt', formatOptions)}\n`

  await Promise.all([
    fsp.writeFile(path.join(cwd, 'oxlint.config.ts'), lintConfig),
    fsp.writeFile(path.join(cwd, 'oxfmt.config.ts'), formatConfig),
  ])
  p.log.success(c.green('Created oxlint.config.ts and oxfmt.config.ts'))

  const legacyFiles = (await fsp.readdir(cwd)).filter(file => /eslint|prettier/i.test(file)).sort()

  if (legacyFiles.length)
    p.note(c.dim(legacyFiles.join(', ')), 'Review and remove legacy config files after verification')
}
