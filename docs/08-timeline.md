# Development Timeline

## Overview

**Total Estimated Time**: 11-16 working days

The project is divided into 5 phases, each building on the previous one.

## Phase 1: Project Setup (1-2 days)

### Day 1

| Task | Time | Description |
|------|------|-------------|
| Initialize Tauri project | 2h | `npm create tauri-app@latest` with React + TypeScript |
| Configure Vite | 1h | Set up build configuration, aliases |
| Install dependencies | 1h | Fluent UI, Zustand, i18next, etc. |
| Create folder structure | 1h | Components, screens, hooks, services, etc. |
| Set up AGENTS.md | 0.5h | Project rules and conventions |

### Day 2

| Task | Time | Description |
|------|------|-------------|
| Configure Fluent UI | 2h | Set up FluentProvider, create theme files |
| Configure i18next | 1h | Set up translations, language detection |
| Set up Zustand store | 1h | Create app store with initial state |
| Prepare ADB binaries | 1h | Download and place in resources folder |
| Generate icons | 1h | Convert SVG to PNG/ICO/ICNS |

### Deliverables

- [ ] Working Tauri dev environment
- [ ] Basic app shell with theme switching
- [ ] Folder structure in place
- [ ] ADB binaries bundled

---

## Phase 2: UI Components (2-3 days)

### Day 3

| Task | Time | Description |
|------|------|-------------|
| WizardLayout component | 3h | Main layout with header, content, footer |
| StepIndicator component | 2h | Progress dots with labels |
| Navigation logic | 2h | Next/Back button handling |

### Day 4

| Task | Time | Description |
|------|------|-------------|
| LanguageSelector component | 1h | Dropdown for language selection |
| VersionCard component | 3h | Card with version info, badge, changelog |
| ConnectionStatus component | 2h | Status indicator with spinner/checkmark |

### Day 5

| Task | Time | Description |
|------|------|-------------|
| InstallStep component | 2h | Step item with status icon |
| LogViewer component | 3h | Expandable log with copy button |
| Platform theme testing | 2h | Test Windows and macOS themes |

### Deliverables

- [ ] All reusable components built
- [ ] Components work with both themes
- [ ] Components are accessible (keyboard, screen reader)

---

## Phase 3: Screens (3-4 days)

### Day 6

| Task | Time | Description |
|------|------|-------------|
| EulaScreen | 4h | License text, checkbox, language selector |
| EULA content (EN/RU) | 2h | Write GPL v3.0 summary in both languages |
| Screen navigation | 1h | Connect to wizard |

### Day 7

| Task | Time | Description |
|------|------|-------------|
| DownloadScreen UI | 4h | Version list, download button, progress |
| Mock data for testing | 1h | Fake releases for UI development |
| Version selection logic | 2h | Radio selection, changelog expand |

### Day 8

| Task | Time | Description |
|------|------|-------------|
| ConnectionScreen UI | 4h | Instructions, images, status |
| Placeholder images | 1h | Create SVG placeholders |
| Connection status logic | 2h | Polling simulation |

### Day 9

| Task | Time | Description |
|------|------|-------------|
| InstallScreen UI | 4h | Step list, progress bar, log viewer |
| CompleteScreen UI | 2h | Success message, next steps |
| Full wizard flow test | 1h | Test all screens in sequence |

### Deliverables

- [ ] All 5 screens implemented
- [ ] Screens work with mock data
- [ ] Full wizard flow works end-to-end
- [ ] Both languages work correctly

---

## Phase 4: Rust Backend (3-4 days)

### Day 10

| Task | Time | Description |
|------|------|-------------|
| ADB path resolution | 2h | Platform-specific ADB binary paths |
| ADB server commands | 2h | start-server, devices |
| Device parsing | 2h | Parse `adb devices -l` output |
| TypeScript bindings | 1h | Create service functions |

### Day 11

| Task | Time | Description |
|------|------|-------------|
| Download command | 3h | HTTP download with progress events |
| Hash verification | 2h | SHA256 calculation and comparison |
| Existing file check | 1h | Check temp folder for cached APK |
| Connect to DownloadScreen | 1h | Wire up frontend to backend |

### Day 12

| Task | Time | Description |
|------|------|-------------|
| Installation steps | 4h | Execute ADB commands in sequence |
| Progress events | 2h | Emit events for each step |
| Error handling | 1h | Capture and report errors |

### Day 13

| Task | Time | Description |
|------|------|-------------|
| Connect to InstallScreen | 2h | Wire up frontend to backend |
| Connect to ConnectionScreen | 2h | Real device detection |
| End-to-end testing | 3h | Test full flow with real device |

### Deliverables

- [ ] All Tauri commands implemented
- [ ] Frontend connected to backend
- [ ] Real device detection works
- [ ] Installation flow works on real device

---

## Phase 5: Testing and Polish (2-3 days)

### Day 14

| Task | Time | Description |
|------|------|-------------|
| Windows testing | 4h | Test on Windows 10/11 |
| Fix Windows issues | 3h | Platform-specific fixes |

### Day 15

| Task | Time | Description |
|------|------|-------------|
| macOS testing | 4h | Test on Intel and Apple Silicon |
| Fix macOS issues | 3h | Platform-specific fixes |

### Day 16

| Task | Time | Description |
|------|------|-------------|
| UI polish | 2h | Animations, transitions, spacing |
| Error handling | 2h | Better error messages, edge cases |
| Final testing | 2h | Full flow on both platforms |
| Build releases | 1h | Create final installers |

### Deliverables

- [ ] App works on Windows 10/11
- [ ] App works on macOS (Intel + Apple Silicon)
- [ ] All error cases handled gracefully
- [ ] Release builds ready for distribution

---

## Summary

| Phase | Days | Focus |
|-------|------|-------|
| 1. Project Setup | 1-2 | Foundation, tooling |
| 2. UI Components | 2-3 | Reusable components |
| 3. Screens | 3-4 | All wizard screens |
| 4. Rust Backend | 3-4 | ADB, download, install |
| 5. Testing & Polish | 2-3 | Platform testing, fixes |
| **Total** | **11-16** | |

## Risk Factors

| Risk | Impact | Mitigation |
|------|--------|------------|
| ADB compatibility issues | High | Test early with real device |
| Platform-specific bugs | Medium | Test on both platforms regularly |
| Fluent UI learning curve | Low | Good documentation available |
| Code signing complexity | Medium | Can skip for initial release |

## Dependencies

Before starting development:

1. [DONE] Technology stack decided (Tauri + React + Fluent UI)
2. [DONE] ADB commands defined
3. [DONE] Screen designs approved
4. [DONE] GitHub repository URL for releases.json
5. [PENDING] Voboost SVG icon for app
6. [PENDING] Instruction images (or use placeholders)

## Next Steps

1. **Approve this plan** - Confirm timeline and approach
2. **Provide missing assets** - Icon, images (or confirm placeholders)
3. **Set up GitHub repository** - For releases.json hosting
4. **Start Phase 1** - Initialize project
