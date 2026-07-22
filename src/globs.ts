export const GLOB_SRC = '**/*.{js,mjs,cjs,jsx,mjsx,cjsx,ts,mts,cts,tsx,mtsx,ctsx}'
export const GLOB_JSX = '**/*.{jsx,mjsx,cjsx}'
export const GLOB_TS = '**/*.{ts,mts,cts}'
export const GLOB_TSX = '**/*.{tsx,mtsx,ctsx}'
export const GLOB_VUE = '**/*.vue'

export const GLOB_TESTS = [
  '**/__tests__/**/*.{js,mjs,cjs,jsx,mjsx,cjsx,ts,mts,cts,tsx,mtsx,ctsx}',
  '**/*.spec.{js,mjs,cjs,jsx,mjsx,cjsx,ts,mts,cts,tsx,mtsx,ctsx}',
  '**/*.test.{js,mjs,cjs,jsx,mjsx,cjsx,ts,mts,cts,tsx,mtsx,ctsx}',
  '**/*.bench.{js,mjs,cjs,jsx,mjsx,cjsx,ts,mts,cts,tsx,mtsx,ctsx}',
  '**/*.benchmark.{js,mjs,cjs,jsx,mjsx,cjsx,ts,mts,cts,tsx,mtsx,ctsx}',
]

export const GLOB_EXCLUDE = [
  '**/node_modules',
  '**/dist',
  '**/coverage',
  '**/output',
  '**/.output',
  '**/.next',
  '**/.nuxt',
  '**/.svelte-kit',
  '**/.vercel',
  '**/.cache',
  '**/.temp',
  '**/.tmp',
  '**/tmp',
  '**/.history',
  '**/.vitepress/cache',
  '**/.changeset',
  '**/.idea',
  '**/.yarn',
  '**/package-lock.json',
  '**/yarn.lock',
  '**/pnpm-lock.yaml',
  '**/bun.lockb',
  '**/CHANGELOG*.md',
  '**/LICENSE*',
  '**/*.min.*',
  '**/__snapshots__',
  '**/vite.config.*.timestamp-*',
  '**/auto-import?(s).d.ts',
  '**/components.d.ts',
  '**/.context',
  '**/.claude',
  '**/.agents',
  '**/.*/skills',
]
