import type { Ignores, OptionsConfig } from './types.ts'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import parse from 'parse-gitignore'
import { GLOB_EXCLUDE, GLOB_TS, GLOB_TSX } from './globs.ts'

const gitmodulePath = /path\s*=\s*(.+)/u
const lineBreak = /\r?\n/u

function toArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

function findUp(name: string, cwd: string): string | undefined {
  let directory = path.resolve(cwd)
  const root = path.parse(directory).root

  while (directory !== root) {
    const candidate = path.join(directory, name)
    if (fs.existsSync(candidate)) return candidate
    directory = path.dirname(directory)
  }

  const candidate = path.join(root, name)
  return fs.existsSync(candidate) ? candidate : undefined
}

function findNestedGitignores(cwd: string, skipDirs: string[]): string[] {
  const files: string[] = []
  const directoriesToSkip = new Set(['.git', 'node_modules', ...skipDirs])
  const queue = [cwd]

  while (queue.length > 0) {
    const directory = queue.shift()!
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name)
      if (entry.isFile() && entry.name === '.gitignore') files.push(absolutePath)
      if (entry.isDirectory() && !directoriesToSkip.has(entry.name)) queue.push(absolutePath)
    }
  }

  return files
}

function prefixPattern(pattern: string, directory: string): string {
  if (!directory || directory === '.') return pattern
  const negated = pattern.startsWith('!')
  const value = negated ? pattern.slice(1) : pattern
  return `${negated ? '!' : ''}${directory}/${value}`
}

function patternsFromFile(file: string, cwd: string, strict: boolean): string[] {
  let content: string

  try {
    content = fs.readFileSync(file, 'utf8')
  } catch (error) {
    if (strict) throw error
    return []
  }

  const relativeDirectory = path.relative(cwd, path.dirname(file)).replaceAll('\\', '/')
  const patterns: string[] = []

  for (const glob of parse(content).globs()) {
    for (const pattern of glob.patterns) {
      const value = glob.type === 'unignore' ? `!${pattern}` : pattern
      if (!relativeDirectory.startsWith('..')) {
        patterns.push(prefixPattern(value, relativeDirectory))
        continue
      }

      if (pattern.startsWith('**')) {
        patterns.push(value)
      } else {
        const pathFromIgnoreFile = path.relative(path.dirname(file), cwd).replaceAll('\\', '/')
        if (pattern.startsWith(`${pathFromIgnoreFile}/`)) {
          const stripped = pattern.slice(pathFromIgnoreFile.length + 1)
          patterns.push(glob.type === 'unignore' ? `!${stripped}` : stripped)
        }
      }
    }
  }

  return patterns
}

function gitmodulePatterns(file: string, cwd: string, strict: boolean, prefixDirectory: boolean): string[] {
  let content: string

  try {
    content = fs.readFileSync(file, 'utf8')
  } catch (error) {
    if (strict) throw error
    return []
  }

  const relativeDirectory = path.relative(cwd, path.dirname(file)).replaceAll('\\', '/')
  const patterns: string[] = []

  for (const line of content.split(lineBreak)) {
    const match = gitmodulePath.exec(line)
    if (match) {
      const pattern = `${match[1].trim()}/**`
      patterns.push(prefixDirectory ? prefixPattern(pattern, relativeDirectory) : pattern)
    }
  }

  return patterns
}

function resolveGitignorePatterns(option: OptionsConfig['gitignore']): string[] {
  if (option === false) return []

  const suppliedAsObject = typeof option === 'object'
  const options = suppliedAsObject ? option : {}
  const cwd = path.resolve(options.cwd ?? process.cwd())
  const root = options.root ?? false
  const strict = options.strict ?? suppliedAsObject
  const rootGitignore = path.join(cwd, '.gitignore')
  const rootGitmodules = path.join(cwd, '.gitmodules')
  const defaultGitignore = root ? rootGitignore : findUp('.gitignore', cwd)
  const defaultGitmodules = root
    ? fs.existsSync(rootGitmodules)
      ? rootGitmodules
      : undefined
    : findUp('.gitmodules', cwd)
  const gitignoreFiles = new Set(
    options.files === undefined
      ? defaultGitignore === undefined
        ? []
        : [defaultGitignore]
      : toArray(options.files).map(file => path.resolve(cwd, file)),
  )

  if (options.recursive !== undefined && options.recursive !== false) {
    const skipDirs = typeof options.recursive === 'object' ? options.recursive.skipDirs : []
    for (const file of findNestedGitignores(cwd, skipDirs)) gitignoreFiles.add(file)
  }

  if (strict && gitignoreFiles.size === 0) throw new Error('No .gitignore file found')

  const explicitGitmoduleFiles = options.filesGitModules !== undefined
  const gitmoduleFiles =
    options.filesGitModules === undefined
      ? defaultGitmodules === undefined
        ? []
        : [defaultGitmodules]
      : toArray(options.filesGitModules).map(file => path.resolve(cwd, file))

  return [
    ...[...gitignoreFiles].flatMap(file => patternsFromFile(file, cwd, strict)),
    ...gitmoduleFiles.flatMap(file => gitmodulePatterns(file, cwd, strict, !explicitGitmoduleFiles)),
  ]
}

export function resolveIgnorePatterns(
  ignores: Ignores | undefined,
  typescript: boolean,
  gitignore: OptionsConfig['gitignore'],
): string[] {
  const defaults = [...GLOB_EXCLUDE]
  if (!typescript) defaults.push(GLOB_TS, GLOB_TSX)

  const resolved = typeof ignores === 'function' ? ignores([...defaults]) : [...defaults, ...(ignores ?? [])]
  return [...resolveGitignorePatterns(gitignore), ...resolved]
}
