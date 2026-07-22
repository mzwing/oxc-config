# Migration gaps

This document lists rules that were enabled by the inherited `@antfu/eslint-config` baseline but are not currently enforced by `@mzwing/oxc-config`.

The inventory contains lint behavior gaps only. Rules replaced by native Oxlint rules, validated JS plugins, TypeScript compiler options, or Oxfmt are not listed. Formatting and ordering differences are also outside this inventory because Oxfmt is the sole formatter and duplicate formatting lint rules are intentionally not used.

This project is an independent fork. The list is not synchronized with future `@antfu/eslint-config` releases and should only change when this project implements or deliberately drops one of the rules below.

## Summary

| Surface           |   Rules | Reason                                                     | Suggested alternative                                 |
| ----------------- | ------: | ---------------------------------------------------------- | ----------------------------------------------------- |
| Core JavaScript   |       5 | No stable native or validated JS-plugin equivalent         | TypeScript, nursery opt-in, or a focused project rule |
| Angular templates |       4 | Requires a template parser and processor                   | Angular compiler or a dedicated template checker      |
| Astro             |       8 | Requires the Astro parser                                  | Astro diagnostics                                     |
| JSON/JSONC/JSON5  |      25 | Requires JSON parser services                              | JSON Schema or a dedicated JSON checker               |
| Markdown          |      14 | Requires a Markdown processor                              | A Markdown-specific checker                           |
| pnpm              |       5 | Requires JSON/YAML parser services                         | pnpm validation in CI                                 |
| React             |       1 | Missing from native React and the validated React-X plugin | A focused project rule                                |
| Svelte            |      38 | Requires the Svelte parser                                 | Svelte diagnostics                                    |
| TOML              |       3 | Requires the TOML parser                                   | TOML schema validation                                |
| Vue               |      71 | Requires full `vue-eslint-parser` services                 | Native script rules plus `vue-tsc`                    |
| Vue accessibility |      22 | Requires Vue template parser services                      | A dedicated Vue accessibility checker                 |
| YAML              |       4 | Requires the YAML parser                                   | YAML schema validation                                |
| **Total**         | **200** |                                                            |                                                       |

## Core JavaScript

- `dot-notation`
- `no-restricted-syntax`
- `no-undef`
- `no-undef-init`
- `no-unreachable-loop`

## Angular templates

- `angular-template/banana-in-box`
- `angular-template/eqeqeq`
- `angular-template/no-negated-async`
- `angular-template/prefer-control-flow`

## Astro

- `astro/missing-client-only-directive-value`
- `astro/no-conflict-set-directives`
- `astro/no-deprecated-astro-canonicalurl`
- `astro/no-deprecated-astro-fetchcontent`
- `astro/no-deprecated-astro-resolve`
- `astro/no-deprecated-getentrybyslug`
- `astro/no-unused-define-vars-in-style`
- `astro/valid-compile`

## JSON, JSONC, and JSON5

- `jsonc/no-bigint-literals`
- `jsonc/no-binary-expression`
- `jsonc/no-binary-numeric-literals`
- `jsonc/no-dupe-keys`
- `jsonc/no-escape-sequence-in-identifier`
- `jsonc/no-floating-decimal`
- `jsonc/no-hexadecimal-numeric-literals`
- `jsonc/no-infinity`
- `jsonc/no-multi-str`
- `jsonc/no-nan`
- `jsonc/no-number-props`
- `jsonc/no-numeric-separators`
- `jsonc/no-octal`
- `jsonc/no-octal-escape`
- `jsonc/no-octal-numeric-literals`
- `jsonc/no-parenthesized`
- `jsonc/no-plus-sign`
- `jsonc/no-regexp-literals`
- `jsonc/no-sparse-arrays`
- `jsonc/no-template-literals`
- `jsonc/no-undefined-value`
- `jsonc/no-unicode-codepoint-escapes`
- `jsonc/no-useless-escape`
- `jsonc/valid-json-number`
- `jsonc/vue-custom-block/no-parsing-error`

## Markdown

- `markdown/heading-increment`
- `markdown/no-duplicate-definitions`
- `markdown/no-empty-definitions`
- `markdown/no-empty-images`
- `markdown/no-empty-links`
- `markdown/no-invalid-label-refs`
- `markdown/no-missing-atx-heading-space`
- `markdown/no-missing-link-fragments`
- `markdown/no-multiple-h1`
- `markdown/no-reference-like-urls`
- `markdown/no-reversed-media-syntax`
- `markdown/no-unused-definitions`
- `markdown/require-alt-text`
- `markdown/table-column-count`

## pnpm

- `pnpm/json-enforce-catalog`
- `pnpm/json-valid-catalog`
- `pnpm/yaml-enforce-settings`
- `pnpm/yaml-no-duplicate-catalog-item`
- `pnpm/yaml-no-unused-catalog-item`

## React

- `react/no-leaked-conditional-rendering`

## Svelte

- `svelte/comment-directive`
- `svelte/derived-has-same-inputs-outputs`
- `svelte/infinite-reactive-loop`
- `svelte/no-at-debug-tags`
- `svelte/no-at-html-tags`
- `svelte/no-dom-manipulating`
- `svelte/no-dupe-else-if-blocks`
- `svelte/no-dupe-on-directives`
- `svelte/no-dupe-style-properties`
- `svelte/no-dupe-use-directives`
- `svelte/no-export-load-in-svelte-module-in-kit-pages`
- `svelte/no-immutable-reactive-statements`
- `svelte/no-inner-declarations`
- `svelte/no-inspect`
- `svelte/no-navigation-without-resolve`
- `svelte/no-not-function-handler`
- `svelte/no-object-in-text-mustaches`
- `svelte/no-raw-special-elements`
- `svelte/no-reactive-functions`
- `svelte/no-reactive-literals`
- `svelte/no-reactive-reassign`
- `svelte/no-shorthand-style-property-overrides`
- `svelte/no-store-async`
- `svelte/no-svelte-internal`
- `svelte/no-unknown-style-directive-property`
- `svelte/no-unnecessary-state-wrap`
- `svelte/no-unused-props`
- `svelte/no-unused-svelte-ignore`
- `svelte/no-useless-children-snippet`
- `svelte/no-useless-mustaches`
- `svelte/prefer-svelte-reactivity`
- `svelte/prefer-writable-derived`
- `svelte/require-each-key`
- `svelte/require-event-dispatcher-types`
- `svelte/require-store-reactive-access`
- `svelte/system`
- `svelte/valid-each-key`
- `svelte/valid-prop-names-in-kit-pages`

## TOML

- `toml/precision-of-fractional-seconds`
- `toml/precision-of-integer`
- `toml/vue-custom-block/no-parsing-error`

## Vue

- `vue/comment-directive`
- `vue/dot-notation`
- `vue/eqeqeq`
- `vue/html-end-tags`
- `vue/jsx-uses-vars`
- `vue/no-child-content`
- `vue/no-deprecated-dollar-listeners-api`
- `vue/no-deprecated-dollar-scopedslots-api`
- `vue/no-deprecated-filter`
- `vue/no-deprecated-functional-template`
- `vue/no-deprecated-html-element-is`
- `vue/no-deprecated-inline-template`
- `vue/no-deprecated-router-link-tag-prop`
- `vue/no-deprecated-scope-attribute`
- `vue/no-deprecated-slot-attribute`
- `vue/no-deprecated-slot-scope-attribute`
- `vue/no-deprecated-v-bind-sync`
- `vue/no-deprecated-v-is`
- `vue/no-deprecated-v-on-native-modifier`
- `vue/no-deprecated-v-on-number-modifiers`
- `vue/no-dupe-v-else-if`
- `vue/no-duplicate-attributes`
- `vue/no-empty-pattern`
- `vue/no-irregular-whitespace`
- `vue/no-lone-template`
- `vue/no-loss-of-precision`
- `vue/no-mutating-props`
- `vue/no-parsing-error`
- `vue/no-ref-as-operand`
- `vue/no-restricted-syntax`
- `vue/no-restricted-v-bind`
- `vue/no-sparse-arrays`
- `vue/no-template-key`
- `vue/no-template-shadow`
- `vue/no-textarea-mustache`
- `vue/no-unused-components`
- `vue/no-unused-refs`
- `vue/no-unused-vars`
- `vue/no-use-computed-property-like-method`
- `vue/no-use-v-if-with-v-for`
- `vue/no-useless-template-attributes`
- `vue/no-useless-v-bind`
- `vue/no-v-for-template-key-on-child`
- `vue/no-v-text-v-html-on-component`
- `vue/object-shorthand`
- `vue/one-component-per-file`
- `vue/prefer-template`
- `vue/require-component-is`
- `vue/require-explicit-emits`
- `vue/require-toggle-inside-transition`
- `vue/require-v-for-key`
- `vue/require-valid-default-prop`
- `vue/use-v-on-exact`
- `vue/valid-attribute-name`
- `vue/valid-template-root`
- `vue/valid-v-bind`
- `vue/valid-v-cloak`
- `vue/valid-v-else`
- `vue/valid-v-else-if`
- `vue/valid-v-for`
- `vue/valid-v-html`
- `vue/valid-v-if`
- `vue/valid-v-is`
- `vue/valid-v-memo`
- `vue/valid-v-model`
- `vue/valid-v-on`
- `vue/valid-v-once`
- `vue/valid-v-pre`
- `vue/valid-v-show`
- `vue/valid-v-slot`
- `vue/valid-v-text`

## Vue accessibility

- `vue-a11y/alt-text`
- `vue-a11y/anchor-has-content`
- `vue-a11y/aria-props`
- `vue-a11y/aria-role`
- `vue-a11y/aria-unsupported-elements`
- `vue-a11y/click-events-have-key-events`
- `vue-a11y/form-control-has-label`
- `vue-a11y/heading-has-content`
- `vue-a11y/iframe-has-title`
- `vue-a11y/interactive-supports-focus`
- `vue-a11y/label-has-for`
- `vue-a11y/media-has-caption`
- `vue-a11y/mouse-events-have-key-events`
- `vue-a11y/no-access-key`
- `vue-a11y/no-aria-hidden-on-focusable`
- `vue-a11y/no-autofocus`
- `vue-a11y/no-distracting-elements`
- `vue-a11y/no-redundant-roles`
- `vue-a11y/no-role-presentation-on-focusable`
- `vue-a11y/no-static-element-interactions`
- `vue-a11y/role-has-required-aria-props`
- `vue-a11y/tabindex-no-positive`

## YAML

- `yaml/no-empty-key`
- `yaml/no-empty-sequence-entry`
- `yaml/no-irregular-whitespace`
- `yaml/vue-custom-block/no-parsing-error`
