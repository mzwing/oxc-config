export const frameworkNames = ['angular', 'astro', 'nextjs', 'react', 'solid', 'svelte', 'unocss', 'vue'] as const

export type FrameworkOption = (typeof frameworkNames)[number]

export interface MigrationOptions {
  frameworks: FrameworkOption[]
  typescript: boolean
  updateVscodeSettings: boolean
}

export interface PackageJson {
  [key: string]: unknown
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  scripts?: Record<string, string>
}
