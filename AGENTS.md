# Voboost Installer - Code Style (CRITICAL)

## Global
- Follows ALL common rules from ../voboost-codestyle/AGENTS.md

## Stack
- Tauri 2.x (Rust + React 18 + TypeScript), Vite 6, Fluent UI React 9, Zustand 5, react-i18next

## CSS
- Plain CSS co-located with components, BEM: `block__element_modifier_value`
- CSS custom properties for theming; no Tailwind, no CSS-in-JS

## Components
- `ComponentName/ComponentName.tsx + .css + index.ts`
- Zustand for global state, React state for local
- Tauri commands return `Result<T, String>` in Rust; use `invoke()` in TypeScript

## Security
- ADB commands validated against whitelist before execution
- APK verified by SHA256 after download; HTTPS only, no telemetry

## i18n
- ALL UI text from `src/i18n/{en,ru}.json`; no hardcoded strings; default English

## OpenSpec
- Spec-driven; truth is openspec, no code without an applied change, invariants live in specs
- propose -> apply -> archive
- `npx @fission-ai/openspec validate <change> --strict`
