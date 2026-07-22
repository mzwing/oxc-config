import { oxlint } from './src/oxlint.ts'

export default oxlint({
  ignorePatterns: ['fixtures'],
  overrides: [
    {
      files: ['bin/index.mjs'],
      rules: {
        'antfu/no-import-dist': 'off',
      },
    },
  ],
  typescript: true,
})
