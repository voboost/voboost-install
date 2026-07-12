# Voboost Installer — Rules

Inherits ../voboost-codestyle/AGENTS.md
[Detailed README](README.md) | [Architecture](docs/01-architecture.md) | [Screens](docs/02-screens.md)

## Stack
- **Tauri 2.x** (Rust + React 18 + TypeScript), **Vite 6**, **Fluent UI React 9**, **Zustand 5**, **react-i18next**

## CSS
- Plain CSS co-located with components, BEM: `block__element_modifier_value`
- CSS custom properties for theming. No Tailwind, no CSS-in-JS

## Components
- `ComponentName/ComponentName.tsx + .css + index.ts`
- Zustand for global state, React state for local
- Tauri commands return `Result<T, String>` in Rust; use `invoke()` in TypeScript

## Security
- ADB commands validated against **whitelist** before execution
- APK verified by **SHA256** hash after download
- **HTTPS only**, no telemetry, all operations local

## i18n
- ALL UI text from `src/i18n/{en,ru}.json` — no hardcoded strings
- Default language: English

## OpenSpec
- Spec-driven; truth is `openspec/`, no code without an applied change, invariants live in specs
- propose -> apply -> archive (mirror `../voboost-inject/openspec`)
- `npx @fission-ai/openspec validate <change> --strict`
