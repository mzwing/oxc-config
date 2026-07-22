import type { MigrationOptions } from '../types.js'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import * as p from '@clack/prompts'
import c from 'ansis'
import { applyEdits, modify, parse } from 'jsonc-parser'
import { vscodeCodeActions, vscodeSettings } from '../constants.js'

const formattingOptions = {
  eol: '\n',
  insertSpaces: true,
  tabSize: 2,
}

export async function updateVscodeSettings(result: MigrationOptions): Promise<void> {
  if (!result.updateVscodeSettings) return

  const directory = path.join(process.cwd(), '.vscode')
  const settingsPath = path.join(directory, 'settings.json')
  await fsp.mkdir(directory, { recursive: true })

  let content = fs.existsSync(settingsPath) ? await fsp.readFile(settingsPath, 'utf8') : '{}\n'
  const current = parse(content) as Record<string, unknown>
  const existingActions =
    typeof current['editor.codeActionsOnSave'] === 'object' && current['editor.codeActionsOnSave'] !== null
      ? (current['editor.codeActionsOnSave'] as Record<string, unknown>)
      : {}

  const updates: [string[], unknown][] = [
    ...Object.entries(vscodeSettings).map(([key, value]) => [[key], value] as [string[], unknown]),
    [['editor.codeActionsOnSave'], { ...existingActions, ...vscodeCodeActions }],
    [['editor.codeActionsOnSave', 'source.fixAll.eslint'], undefined],
  ]

  for (const [jsonPath, value] of updates)
    content = applyEdits(content, modify(content, jsonPath, value, { formattingOptions }))

  await fsp.writeFile(settingsPath, content.endsWith('\n') ? content : `${content}\n`)
  p.log.success(c.green('Updated .vscode/settings.json for the Oxc extension'))
}
