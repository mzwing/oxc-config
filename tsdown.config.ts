import { defineConfig } from 'tsdown'
import { StaleGuardRecorder } from 'tsdown-stale-guard'

export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
    index: 'src/index.ts',
    'js-plugins/*': 'src/js-plugins/*.ts',
    oxfmt: 'src/oxfmt.ts',
    oxlint: 'src/oxlint.ts',
  },
  dts: true,
  shims: true,
  format: ['esm'],
  exports: { exclude: ['js-plugins/**'] },
  plugins: [StaleGuardRecorder()],
})
