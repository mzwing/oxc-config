# @mzwing/oxc-config

An opinionated shared configuration for [Oxlint](https://oxc.rs/docs/guide/usage/linter/) and [Oxfmt](https://oxc.rs/docs/guide/usage/formatter/), building on the top of `@antfu/eslint-config`.

The remaining unsupported lint rules used by antfu's config are tracked in [migration.md](./migration.md).

## CLI

The interactive install wizard detects TypeScript and common frameworks, generates both configuration files, updates scripts and lint-staged, migrates ignore files, and configures the Oxc VS Code extension.

```bash
pnpm dlx @mzwing/oxc-config@latest
```

For non-interactive setup:

```bash
pnpm dlx @mzwing/oxc-config@latest --yes --typescript --framework react --framework nextjs
```

The wizard never deletes legacy ESLint or Prettier files and refuses to overwrite an existing Oxc configuration.

## Manual Install

```bash
pnpm add -D @mzwing/oxc-config oxlint oxfmt
```

Create the two tool-specific configuration files:

```ts
// oxlint.config.ts
import oxlint from '@mzwing/oxc-config'

export default oxlint()
```

```ts
// oxfmt.config.ts
import { oxfmt } from '@mzwing/oxc-config'

export default oxfmt()
```

Recommended scripts:

```json
{
  "scripts": {
    "format": "oxfmt --write .",
    "format:check": "oxfmt --check .",
    "lint": "oxlint",
    "lint:fix": "oxlint --fix"
  }
}
```

## Oxlint

It should be compatible with the original rule style of `@antfu/eslint-config`.

For a Rust-only configuration:

```ts
export default oxlint({
  jsPlugins: false,
})
```

Node, JSDoc, and React can keep their native rules while disabling only their supplemental JS plugin:

```ts
export default oxlint({
  jsdoc: { jsPlugin: false },
  node: { jsPlugin: false },
  react: { jsPlugin: false },
})
```

Angular, Solid, and UnoCSS require JS plugins and cannot be combined with `jsPlugins: false`.

### TypeScript and type-aware linting

The TypeScript integration enables its regular rules and Oxlint's type-aware engine together. Install `oxlint-tsgolint` and opt in explicitly:

```bash
pnpm add -D oxlint-tsgolint
```

```ts
export default oxlint({
  typescript: true,
})
```

If you need custom tsconfig path, you'll have to specify it in the CLI like `oxlint --tsconfig ./path/to/tsconfig.json`, since Oxlint 1.74 automatically discovers the project and does not accept a tsconfig path in its configuration schema.

`ts/no-explicit-any: warn` is enabled by default.

## Oxfmt

Try preserve antfu's formatting style as much as possible:

- no semicolons
- two-space indentation
- single quotes in JavaScript and TypeScript
- double quotes in JSX attributes
- trailing commas wherever supported
- 120-column print width
- import sorting without reordering side-effect imports
- package.json sorting

All native Oxfmt options can be overridden directly:

```ts
import { oxfmt } from '@mzwing/oxc-config'

export default oxfmt({
  singleQuote: false,
  useTabs: true,
})
```

If you need Svelte formatting, enable it explicitly and keep `svelte` installed in the project:

```ts
export default oxfmt({
  svelte: true,
})
```

Others the same.

## Editor

Install the `oxc.oxc-vscode` extension and use it as the default formatter. The CLI can update `.vscode/settings.json` without discarding comments or unrelated settings.

## License

MIT
