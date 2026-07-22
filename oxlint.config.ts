import { oxlint } from './src/oxlint.ts'

export default oxlint({
  type: 'lib',
  ignores: ['fixtures'],
  typescript: true,
})
