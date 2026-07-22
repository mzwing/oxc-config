import type { MigrationOptions, PackageJson } from '../types.js'
import fsp from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import * as p from '@clack/prompts'
import c from 'ansis'
import { peerDependencies, version } from '../../../package.json'

const dependencyVersions = {
  '@mzwing/oxc-config': `^${version}`,
  ...peerDependencies,
  'oxlint-tsgolint': '^7.0.2001',
}

type DependencyName = keyof typeof dependencyVersions

const dependencyPackages = {
  angular: ['@angular-eslint/eslint-plugin'],
  base: ['@mzwing/oxc-config', 'oxfmt', 'oxlint'],
  react: ['@eslint-react/eslint-plugin'],
  solid: ['eslint-plugin-solid'],
  svelte: ['svelte'],
  typescript: ['oxlint-tsgolint'],
  unocss: ['@unocss/eslint-plugin'],
} as const satisfies Record<string, readonly DependencyName[]>

export function getDependencyVersions(result: MigrationOptions): Record<string, string> {
  const names = new Set<DependencyName>(dependencyPackages.base)

  if (result.frameworks.includes('react')) dependencyPackages.react.forEach(name => names.add(name))
  if (result.frameworks.includes('solid')) dependencyPackages.solid.forEach(name => names.add(name))
  if (result.frameworks.includes('svelte')) dependencyPackages.svelte.forEach(name => names.add(name))
  if (result.frameworks.includes('angular')) dependencyPackages.angular.forEach(name => names.add(name))
  if (result.frameworks.includes('unocss')) dependencyPackages.unocss.forEach(name => names.add(name))
  if (result.typescript) dependencyPackages.typescript.forEach(name => names.add(name))

  return Object.fromEntries([...names].sort().map(name => [name, dependencyVersions[name]]))
}

export async function updatePackageJson(result: MigrationOptions): Promise<void> {
  const packagePath = path.join(process.cwd(), 'package.json')
  const pkg = JSON.parse(await fsp.readFile(packagePath, 'utf8')) as PackageJson
  const dependencies = getDependencyVersions(result)

  pkg.devDependencies = {
    ...pkg.devDependencies,
    ...dependencies,
  }
  pkg.scripts = {
    ...pkg.scripts,
    format: 'oxfmt --write .',
    'format:check': 'oxfmt --check .',
    lint: 'oxlint',
    'lint:fix': 'oxlint --fix',
  }
  pkg['lint-staged'] = {
    '*.{cjs,cjsx,cts,ctsx,js,jsx,mjs,mjsx,mts,mtsx,ts,tsx,vue}': ['oxfmt --write', 'oxlint --fix'],
    '*.{css,graphql,gql,html,json,json5,jsonc,less,md,mdx,scss,svelte,toml,yaml,yml}': 'oxfmt --write',
  }

  await fsp.writeFile(packagePath, `${JSON.stringify(pkg, null, 2)}\n`)
  p.log.success(c.green('Updated package.json scripts and development dependencies'))
}
