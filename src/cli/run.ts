import type { FrameworkOption, MigrationOptions, PackageJson } from './types.js'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { installPackage } from '@antfu/install-pkg'
import * as p from '@clack/prompts'
import c from 'ansis'
import { frameworkOptions } from './constants.js'
import { updateConfigFiles } from './stages/update-config-files.js'
import { getDependencyVersions, updatePackageJson } from './stages/update-package-json.js'
import { updateVscodeSettings } from './stages/update-vscode-settings.js'
import { detectFrameworks, detectTypescript, hasUncommittedChanges, normalizeFrameworks } from './utils.js'

export interface CliRunOptions {
  frameworks?: string[]
  install?: boolean
  typescript?: boolean
  updateVscodeSettings?: boolean
  yes?: boolean
}

export async function run(options: CliRunOptions = {}): Promise<void> {
  const cwd = process.cwd()
  const packagePath = path.join(cwd, 'package.json')
  if (!fs.existsSync(packagePath)) throw new Error('No package.json found in the current directory.')

  const existingTargets = ['oxlint.config.ts', 'oxfmt.config.ts'].filter(file => fs.existsSync(path.join(cwd, file)))
  if (existingTargets.length > 0)
    throw new Error(`Refusing to overwrite existing config: ${existingTargets.join(', ')}`)

  const pkg = JSON.parse(await fsp.readFile(packagePath, 'utf8')) as PackageJson
  const detectedFrameworks = detectFrameworks(pkg, cwd)
  const detectedTypescript = detectTypescript(pkg, cwd)
  const requestedFrameworks =
    options.frameworks !== undefined && options.frameworks.length > 0
      ? normalizeFrameworks(options.frameworks)
      : detectedFrameworks
  const requestedTypescript = options.typescript ?? detectedTypescript

  let result: MigrationOptions = {
    frameworks: requestedFrameworks,
    typescript: requestedTypescript,
    updateVscodeSettings: options.updateVscodeSettings ?? true,
  }

  if (options.yes !== true) {
    if (hasUncommittedChanges(cwd)) {
      const confirmed = await p.confirm({
        initialValue: false,
        message: 'There are uncommitted changes. Continue with the Oxc migration?',
      })
      if (p.isCancel(confirmed) || !confirmed) {
        p.cancel('Operation cancelled.')
        return
      }
    }

    const frameworks = await p.multiselect<FrameworkOption>({
      initialValues: requestedFrameworks,
      message: 'Select project integrations:',
      options: frameworkOptions,
      required: false,
    })
    if (p.isCancel(frameworks)) {
      p.cancel('Operation cancelled.')
      return
    }

    const typescript = await p.confirm({
      initialValue: requestedTypescript,
      message: 'Enable TypeScript and type-aware linting with oxlint-tsgolint?',
    })
    if (p.isCancel(typescript)) {
      p.cancel('Operation cancelled.')
      return
    }

    const updateSettings = await p.confirm({
      initialValue: options.updateVscodeSettings ?? true,
      message: 'Update VS Code settings for Oxlint and Oxfmt?',
    })
    if (p.isCancel(updateSettings)) {
      p.cancel('Operation cancelled.')
      return
    }

    result = {
      frameworks: normalizeFrameworks(frameworks),
      typescript,
      updateVscodeSettings: updateSettings,
    }
  }

  await updateConfigFiles(result)
  await updatePackageJson(result)
  await updateVscodeSettings(result)

  if (options.install !== false) {
    const dependencies = getDependencyVersions(result)
    const packages = Object.entries(dependencies).map(([name, version]) => `${name}@${version}`)
    p.log.step(c.cyan('Installing Oxc dependencies'))
    await installPackage(packages, { dev: true })
  }

  p.log.success(c.green('Oxc setup completed'))
  p.outro(`Run ${c.blue('pnpm lint')} and ${c.blue('pnpm format:check')} to verify the migration.\n`)
}
