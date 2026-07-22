import type { FrameworkOption, PackageJson } from './types.js'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { frameworkNames } from './types.js'

const knownFrameworks = new Set<string>(frameworkNames)

export function hasUncommittedChanges(cwd = process.cwd()): boolean {
  try {
    return (
      execFileSync('git', ['status', '--porcelain'], {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim() !== ''
    )
  } catch {
    return false
  }
}

function packageNames(pkg: PackageJson): Set<string> {
  return new Set(
    Object.keys({
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
    }),
  )
}

export function detectFrameworks(pkg: PackageJson, cwd = process.cwd()): FrameworkOption[] {
  const packages = packageNames(pkg)
  const detected = new Set<FrameworkOption>()

  if (packages.has('vue') || packages.has('nuxt') || packages.has('vitepress')) detected.add('vue')
  if (packages.has('react') || packages.has('react-dom')) detected.add('react')
  if (packages.has('next')) {
    detected.add('nextjs')
    detected.add('react')
  }
  if (packages.has('svelte') || packages.has('@sveltejs/kit')) detected.add('svelte')
  if (packages.has('astro') || fs.existsSync(path.join(cwd, 'astro.config.mjs'))) detected.add('astro')
  if (packages.has('solid-js')) detected.add('solid')
  if (packages.has('@angular/core')) detected.add('angular')
  if ([...packages].some(name => name === 'unocss' || name.startsWith('@unocss/'))) detected.add('unocss')

  return [...detected]
}

export function detectTypescript(pkg: PackageJson, cwd = process.cwd()): boolean {
  const packages = packageNames(pkg)

  return (
    packages.has('typescript') ||
    packages.has('@typescript/native-preview') ||
    fs.existsSync(path.join(cwd, 'tsconfig.json'))
  )
}

export function normalizeFrameworks(values: string[]): FrameworkOption[] {
  const normalized = new Set<FrameworkOption>()

  for (const value of values) {
    const framework = value.trim()
    if (!knownFrameworks.has(framework)) throw new Error(`Unknown framework "${value}".`)
    normalized.add(framework as FrameworkOption)
  }

  if (normalized.has('nextjs')) normalized.add('react')

  return [...normalized]
}
