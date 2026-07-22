import process from 'node:process'
import * as p from '@clack/prompts'
import c from 'ansis'
import { cac } from 'cac'
import { version } from '../../package.json'
import { run } from './run.js'

function optionValues(value?: string | string[]): string[] {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

interface CliArgs {
  framework?: string | string[]
  install?: boolean
  typescript?: boolean
  vscode?: boolean
  yes?: boolean
}

const cli = cac('oxc-config')

cli
  .command('', 'Initialize or migrate a project to Oxlint and Oxfmt')
  .option('--yes, -y', 'Skip prompts and use detected defaults', { default: false })
  .option('--framework, -f <framework>', 'Enable a framework integration')
  .option('--typescript', 'Enable TypeScript and type-aware linting')
  .option('--no-install', 'Only update files; do not install dependencies')
  .option('--no-vscode', 'Do not update VS Code settings')
  .action(async (args: CliArgs) => {
    p.intro(`${c.green('@mzwing/oxc-config ')}${c.dim(`v${version}`)}`)
    try {
      await run({
        frameworks: optionValues(args.framework),
        install: args.install,
        typescript: args.typescript,
        updateVscodeSettings: args.vscode,
        yes: args.yes,
      })
    } catch (error) {
      p.log.error(c.inverse.red(' Oxc migration failed '))
      p.log.error(c.red(`✘ ${String(error)}`))
      process.exitCode = 1
    }
  })

cli.help()
cli.version(version)
cli.parse()
