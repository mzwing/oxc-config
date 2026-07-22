import type { FrameworkOption } from './types.js'
import c from 'ansis'

export const frameworkOptions: { label: string; value: FrameworkOption }[] = [
  { label: c.green('Vue'), value: 'vue' },
  { label: c.cyan('React'), value: 'react' },
  { label: c.blue('Next.js'), value: 'nextjs' },
  { label: c.red('Svelte'), value: 'svelte' },
  { label: c.magenta('Astro'), value: 'astro' },
  { label: c.yellow('Solid'), value: 'solid' },
  { label: c.red('Angular'), value: 'angular' },
  { label: c.cyan('UnoCSS'), value: 'unocss' },
]

export const vscodeSettings = {
  'editor.defaultFormatter': 'oxc.oxc-vscode',
  'editor.formatOnSave': true,
  'eslint.enable': false,
  'prettier.enable': false,
  'oxc.enable': true,
} as const

export const vscodeCodeActions = {
  'source.fixAll.oxc': 'explicit',
  'source.organizeImports': 'never',
} as const
