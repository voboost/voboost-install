# PROGRESS — Unified OTA & Release Pipeline

**Последнее обновление:** 2026-07-20
**Статус:** архитектура спроектирована, Шаг 2 выполнен, **спираются на Шаг 3**.

Этот файл — точка входа для продолжения работы. Свежая сессия должна прочитать:
1. Этот файл
2. `docs/17-ota-architecture.md` (source of truth архитектуры)
3. `plans/2026-07-19-unified-ota-and-release.md` (полный план + шаги)

---

## Что already сделано (НЕ переделывать)

### Архитектура и документы (в voboost-install)
- `docs/17-ota-architecture.md` — целевая OTA-архитектура
- `plans/2026-07-19-unified-ota-and-release.md` — план реализации (9 шагов)
- Зафиксированы решения: agents внутри app APK, трёхуровневые ключи (key-app/ota/root), контракт имён core→inject, формат inject = один ELF + appended-sig

### Шаг 2 — выполнен (commit `661dbad` в voboost-app, запушен на origin)
- `build.gradle.kts`: `copyFridaScripts` (копировал устаревший `*_3debug.js`) заменён на `copyAgents`
- `copyAgents` копирует `../voboost-script/build/*-mod.js` → `assets/agents/<name>.js` (с переименованием) + `manifest.json` → `agents-manifest.json`
- `.gitignore`: добавлен `src/main/assets/agents/` (build-time, не коммитить)
- Проверено: APK собирается, 17 файлов agents в `assets/agents/`
- `notCompatibleWithConfigurationCache` — task помечен явно (rename-ламбды не сериализуются)

### Шаг 9 (apk-size) — уже применён ранее в коммите `a78ce4b` (voboost-app)
- APK сейчас **10.4 МБ** (было 38 МБ)
- R8 (`isMinifyEnabled=true`), `isShrinkResources=true`, excludes (screenshots/ttf/bouncycastle/pqc), `keep.xml` — всё в `build.gradle.kts`

### История voboost-app вычищена (3 force-push'а за сессию)
- Удалён «мусорный» коммит `de1d2a1` (скрытый откат лицензии + удаление openspec)
- LICENSE + canonical README License-секция перенесены в root-коммит через `filter-branch --tree-filter`
- Удалён избыточный `3146b03` (license-коммит, стал пустым после нормализации)
- Root-коммит теперь содержит canonical LICENSE (PolyForm) + README с dual-license секцией (как у соседей)
- Backup-теги для отката: `backup-origin-main-20260720`, `backup-pre-normalize-20260720`, `backup-pre-filterrepo-20260720`, `backup-pre-rootrewrite-20260720`

---

## ⏭ СЛЕДУЮЩИЙ ШАГ — Шаг 3 (в репозитории `voboost-inject`)

Это **крупнейший и самый рискованный** шаг. Security-критичная логика (daemon self-update, atomic rollback). Выполнять **аккуратно, с тестами, на свежую голову**.

### Что входит в Шаг 3

**Под-шаг 3A — Механическое переименование `core` → `inject` (низкий риск, сделать первым отдельным коммитом)**
- `src/ota.vala` (~39 вхождений): константы `CORE_BINARY`→`INJECT_BINARY`, `CORE_PREV`→`INJECT_PREV`, `CORE_MARKER`→`INJECT_MARKER` (значение `"run/voboost-inject-switch-pending"`), `CORE_UPDATE_READY`→`INJECT_UPDATE_READY` (значение `"voboost-inject-update-ready"`); enum `CoreApplyOutcome`→`InjectApplyOutcome`; метод `apply_core_apk_update`→`apply_inject_update`; `find_core`→`find_inject`; `channel == "core"`→`channel == "inject"`; `core_update_ready`/`consume_core_update_ready`/`core_switch_pending`/`confirm_core_switch`/`rollback_core_switch` → `inject_*`
- `src/app_zone_watcher.vala` (3): сигнал `core_update_ready`→`inject_update_ready`; строка `"core-update-ready"`→`"voboost-inject-update-ready"` (2 места)
- `src/supervisor.vala` (8): вызовы переименованных методов, `core_self_shutdown_requested`→`inject_self_shutdown_requested`, лог-сообщения
- **Имена файлов на диске** (контракт):
  - `core-update-ready` → `voboost-inject-update-ready`
  - `run/core-switch-pending` → `run/voboost-inject-switch-pending`
  - `manifest.json` (daemon) → `voboost-inject-manifest.json` (+ `.prev`, `.sig`, `.sig.prev`)
- `openspec/specs/*.md` в voboost-inject — обновить формулировки core→inject (9 spec-файлов: `update-planes`, `atomic-apply-rollback`, `ci-release`, `provisioning`, `system-ota-survival`, `daemon-lifecycle`, `release-manifest`, `incremental-delta`, `build-and-signing`)
- **Синхронно в voboost-app** (иначе парсинг манифеста сломается):
  - `src/main/java/ru/voboost/ota/OtaModels.kt`: `enum Channel { APP, CORE }` → `{ APP, INJECT }`; сериализация `channel.name.lowercase()` → строка `"inject"`
  - `src/main/java/ru/voboost/ota/ApkStager.kt`: `CORE_APK_NAME`→`INJECT_FILE_NAME`, `CORE_UPDATE_READY_MARKER`→`INJECT_UPDATE_READY_MARKER` (значение `"voboost-inject-update-ready"`), `CORE_APK_NAME="voboost-inject.apk"` → `INJECT_FILE_NAME="voboost-inject"` (без .apk, см. 3B)
  - `OtaClient.kt`: `Channel.CORE` → `Channel.INJECT`, все `core` references в логах/комментариях

**Под-шаг 3B — Упразднить ZIP, ввести appended-signature ELF (ВЫСОКИЙ риск, отдельным коммитом после 3A)**

Формат нового inject-файла (один ELF + trailing signature, см. `docs/17-ota-architecture.md` §4.2):
```
voboost-inject (один файл)
├── ELF-часть (исполняемая, как сегодня)
└── trailing signature block:
    ├── MAGIC      "VOBSIG1"   (8 байт, ASCII)
    ├── SIG_OFFSET             (8 байт, LE uint64) — смещение конца ELF-части
    ├── SIGNATURE              (64 байта ed25519) — над байтами [0 .. SIG_OFFSET)
    └── (padding до выравнивания 16 байт)
```

Файлы для правки:
- `src/ota.vala`:
  - **Удалить** `extract_apk_entry` + `read_local_entry` + `inflate_raw` + `read_le16`/`read_le32` ZIP-reader (~200 строк, строки 488-686) — больше не нужен
  - **Удалить** константы `APK_BINARY_ENTRY`, `APK_MANIFEST_ENTRY`, `APK_MANIFEST_SIG_ENTRY`, `MAX_APK_ENTRIES`
  - **Добавить** `verify_appended_sig(path) → (bytes, ok)`: читает trailing bytes, находит magic `VOBSIG1`, берёт SIG_OFFSET и SIGNATURE, хеширует `[0..SIG_OFFSET)`, verify через `this.trust.verify_signature(hash_bytes, sig)`. Возвращает ELF-байты (без trailing)
  - `apply_inject_update` упрощается: read staged file → `verify_appended_sig` → install ELF-байты (как сегодня `write_bytes_exec`)
  - **Удалить** `find_staged_apk` → `find_staged_inject`: ищет `voboost-inject` (без `.apk`) в staging
- `Makefile`:
  - Удалить таргет `core-apk` (ZIP-упаковка 3 entry)
  - Добавить таргет `sign-elf`: `openssl pkeyutl -sign -rawin -inkey $KEY -in $BINARY` → append magic+offset+sig → `build/voboost-inject` (signed)
  - Обновить `release-manifest` таргет: убрать упаковку agents-манифеста в ZIP (agents-манифест теперь rides в app APK)
- `.github/workflows/release.yml`: заменить `make core-apk` → `make sign-elf`; `gh release upload voboost-inject.apk` → `voboost-inject` (один ELF-файл)
- `voboost-install/releases/manifest.json`: `downloadUrl` для inject → `.../voboost-inject` (без расширения)

### Порядок выполнения Шага 3 (рекомендация)
1. **3A первым отдельным коммитом** — механика, проверяется `make build` + `make test` + `npx openspec validate --all --strict`
2. **3B вторым отдельным коммитом** — требует тестов на `verify_appended_sig` (signature valid/invalid, magic missing, truncated), прогон на эмуляторе end-to-end
3. После каждого — `make -C voboost-inject test` и `./gradlew testUnit` в voboost-app

### Верификация Шага 3
- `make -C voboost-inject build && make -C voboost-inject test`
- `cd ../voboost && ./gradlew testUnit` (с `ANDROID_HOME=/Users/vitaly/Library/Android/sdk`)
- `npx --yes @fission-ai/openspec validate --all --strict` в обоих репо
- На эмуляторе: stage signed-ELF → маркер → daemon self-update (см. `tools/emulator/`)

---

## Дальнейшие шаги (после Шага 3)

- **Шаг 4** — app `ScriptExtractor.kt` (извлекает agents из APK → staging): новый файл в `voboost/src/main/java/ru/voboost/ota/`. Вызывается на старте `VoboostService` и после OTA self-update app. Логика в `docs/17-ota-architecture.md` §7.1
- **Шаг 5** — daemon consume agents из staging (новый маркер `agents-update-ready`): новая ветка в `app_zone_watcher.vala` + метод `apply_agents_update` в `ota.vala` + интеграция в `supervisor.vala`
- **Шаг 6** — упростить `voboost-install` CLI: убрать `--agents-dir`, `--manifest`, `--manifest-sig`, `--release-key`, `--daemon-bin`; добавить `--file-app`/`--file-inject`/`--version`. Файлы: `tauri.conf.json`, `lib.rs`, `cli_runner.rs`, `install.rs`, `config-provision.json`
- **Шаг 7** — переименование ключей: `key-dev-*`→`key-root-*` (voboost-inject/config), `release-*`→`key-ota-*` (voboost-install/config), удалить дубликат `release-*.pem` в voboost-inject (мёртвый, не используется), обновить CI-секреты (`KEY_ROOT_PRIVATE`, `KEY_OTA_PRIVATE`, `KEYSTORE_PASSWORD`)
- **Шаг 8** — единый release-pipeline: новые/изменённые workflow в 4 репо (voboost-script release.yml — новый, voboost release.yml — новый, voboost-inject release.yml — правка, voboost-install publish-ota.yml — новый)

---

## ⚠️ Критические gotchas (что легко упустить)

1. **`voboost-inject` имеет unstaged правку `meson.build`** — `frida-core:compat=disabled` → `auto`. Это **не моё**, не трогать (чужой WIP). Не коммитить вместе с Шагом 3.

2. **`frida-core` строки НЕ переименовывать** — это название библиотеки (`frida-core-1.0`, `subproject('frida-core')` в `src/meson.build`). Переименованию подлежат только Voboost-специфичные `core` (связанные с daemon self-update).

3. **Android SDK на этой машине**: `~/Library/Android/sdk`. В `local.properties` нет `sdk.dir` (только keystore password и ota URL). Для локальных сборок voboost-app: `ANDROID_HOME=/Users/vitaly/Library/Android/sdk ./gradlew build`.

4. **Конфигурация remote в voboost-app была сброшена filter-repo** — я восстановил `git remote add origin git@github.com:voboost/voboost.git`. Если в новой сессии `git push` падает с "does not appear to be a git repository" — re-add remote.

5. **3 force-push'а за сессию переписали все SHA voboost-app.** Любые ссылки на конкретные SHA в документации/issues — битые. Backup-теги (`backup-origin-main-20260720` и др.) хранят старые состояния для отката.

6. **`channel: "core"` — это поле в release-manifest** (внутри staged ELF/ZIP), парсится в `OtaModels.kt:42` (`Channel.valueOf(channelStr.uppercase())` → `Channel.CORE`) и `ota.vala:38` (`f.channel == "core"`). Переименование channel **требует синхронной** правки парсера в обоих репо + Makefile gen release-manifest.

7. **agents-manifest vs inject-manifest vs release-manifest — три разные вещи.** Не путать:
   - `agents-manifest.json` — список agents с sha256 (rides в app APK, подписан key-root)
   - `voboost-inject-manifest.json` (после 3A) — core-манифест daemon'а (rides в inject-ELF staging, подписан key-root)
   - `release-manifest` (внутри старого ZIP) — упраздняется в 3B

8. **Daemon читает agents `.js` с диска** (`frida_controller.vala:411`, `FileUtils.get_data(path)` из `/data/voboost/agents/`), сверяя sha256 с манифестом. Сегодня **только installer** кладёт `.js` туда (через `--agents-dir`). После Шагов 4+5 это будет делать app→staging→daemon.

9. **`scriptsDirectory` в `PathsAndroid.kt` сейчас указывает на `/data/data/ru.voboost/scripts/`** — устаревший путь. В Шаге 4 заменить/удалить (ScriptExtractor будет писать в существующий `stagingDir`). В Шаге 2 **намеренно не трогал**.

10. **Тесты в voboost-app требуют `scriptsDirectory` override** — 4 файла (`PlanProducerTest`, `StatusReaderTest`, `ApkStagerTest`, `OtaClientTest`) содержат `override val scriptsDirectory`. При удалении поля в Шаге 4 — убрать override из тестов тоже.

---

## Состояние репозиториев (на момент остановки)

### voboost-app (`/Users/vitaly/voboost/voboost`)
- branch `main`, synced с origin
- HEAD: `661dbad build(app): add copyAgents carrier-assets task`
- working tree: чистый
- backup-теги: `backup-origin-main-20260720`, `backup-pre-normalize-20260720`, `backup-pre-filterrepo-20260720`, `backup-pre-rootrewrite-20260720`
- local.properties (gitignored): `KEYSTORE_PASSWORD=UHiQlF3ANvQHxVdYgvLU`, `ota.manifestUrl=file:///data/local/tmp/voboost-releases/manifest.json`

### voboost-inject (`/Users/vitaly/voboost/voboost-inject`)
- branch `main`, synced с origin
- working tree: **1 unstaged правка** `meson.build` (frida-core compat — НЕ ТРОГАТЬ, чужой WIP)
- Для Шага 3: stash или commit эту правку отдельно перед началом, либо оставить и работать вокруг неё

### voboost-script (`/Users/vitaly/voboost/voboost-script`)
- branch `main` (synced — проверить в новой сессии)
- Не затрагивался этой сессией. `npm run build` генерирует `build/*-mod.js` + `manifest.json` (БЕЗ `.sig` — подпись пока не реализована, нужна для Шага 8 release pipeline)

### voboost-install (`/Users/vitaly/voboost/voboost-install`)
- branch `main` (synced — проверить)
- Содержит дизайн-документы этой работы: `docs/17-ota-architecture.md`, `plans/2026-07-19-unified-ota-and-release.md`, этот `PROGRESS.md`
- Ранние коммиты этой сессии: Linux-поддержка (add-linux-support openspec change, CI workflows) — отдельная завершённая работа, не связана с OTA-архитектурой

---

## Быстрый старт новой сессии

Промпт для продолжения:
```
Прочитай /Users/vitaly/voboost/voboost-install/PROGRESS.md,
затем docs/17-ota-architecture.md и plans/2026-07-19-unified-ota-and-release.md.
Начни с Под-шага 3A (переименование core→inject в voboost-inject и voboost-app),
отдельным атомарным коммитом. Не трогай unstaged meson.build в voboost-inject.
После 3A — прогон make test и openspec validate, затем переходи к 3B.
```
