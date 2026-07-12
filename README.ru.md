# Voboost Installer

[English](README.md) | **Русский**

Кроссплатформенный десктопный установщик Android-приложения Voboost для головных устройств автомобилей Voyah. Поддерживает macOS и Windows.

## Обзор

Voboost Installer — это удобное десктопное приложение, которое автоматизирует установку Android-приложения Voboost на мультимедийные системы автомобилей Voyah. Оно имеет интерфейс мастера из 6 шагов (Приветствие, Лицензия, Прошивка, Подключение, Установка, Завершение), поддержку нескольких языков и единый пакетный режим командной строки для автоматизации.

## Для пользователей

### Установка на macOS

1. Скачайте последний файл DMG со страницы [Releases](https://github.com/voboost/voboost-install/releases)
2. Дважды щелкните на файл DMG, чтобы смонтировать его
3. Перетащите `voboost-install.app` в папку Applications
4. Запустите приложение из папки Applications или Launchpad
5. При первом запуске может потребоваться нажать правой кнопкой мыши и выбрать "Open", если macOS покажет предупреждение безопасности

### Установка на Windows

1. Скачайте последний установщик NSIS (`.exe`) со страницы [Releases](https://github.com/voboost/voboost-install/releases)
2. Дважды щелкните на установщик, чтобы запустить его
3. Следуйте инструкциям мастера установки
4. Запустите приложение из меню Пуск или с рабочего стола

### Пакетный режим (командная строка)

Установщик может работать полностью из командной строки без открытия графического окна. Это идеально подходит для сценариев автоматизации и удаленной интеграции. Доступно три пакетных режима; за один запуск выбирается ровно один.

#### Примеры для macOS

```bash
# Полная установка: APK + демон + агенты + манифест + init-хук
/Volumes/voboost-install/voboost-install.app/Contents/MacOS/voboost-install \
    --install "/path/to/voboost-debug.apk" \
    --daemon-bin "/path/to/voboost-inject" \
    --agents-dir "/path/to/agents" \
    --manifest "/path/to/manifest.json" \
    --manifest-sig "/path/to/manifest.sig" \
    --lang ru

# Восстановление init-хука после системного OTA (артефакты не нужны)
./src-tauri/target/aarch64-apple-darwin/release/voboost-install --restore --lang en

# Полное удаление: остановка демона, удаление хука, очистка данных, удаление APK, перезагрузка
./src-tauri/target/aarch64-apple-darwin/release/voboost-install --uninstall
```

#### Примеры для Windows

```bash
# Полная установка
"C:\Program Files\voboost-install\voboost-install.exe" ^
    --install "C:\path\to\voboost-debug.apk" ^
    --daemon-bin "C:\path\to\voboost-inject.exe" ^
    --agents-dir "C:\path\to\agents" ^
    --manifest "C:\path\to\manifest.json" ^
    --manifest-sig "C:\path\to\manifest.sig" ^
    --lang en

# Восстановление init-хука после системного OTA
.\src-tauri\target\release\voboost-install.exe --restore --lang ru

# Полное удаление
.\src-tauri\target\release\voboost-install.exe --uninstall
```

#### Доступные флаги CLI

- `--install <apk>` (`-i`) - Полная установка в пакетном режиме: APK + демон + агенты + манифест + init-хук. Требует `--daemon-bin`, `--agents-dir`, `--manifest`, `--manifest-sig`; `--release-key` опционален.
- `--restore` (`-r`) - Восстановить init-хук после системного OTA (артефакты не нужны).
- `--uninstall` (`-U`) - Полное удаление: остановить демон, удалить init-хук, очистить `/data/voboost`, удалить APK, перезагрузка.
- `--daemon-bin <path>` - Путь к бинарному файлу демона voboost-inject (для --install).
- `--agents-dir <path>` - Каталог с файлами агентов (для --install).
- `--manifest <path>` - Путь к manifest.json (для --install).
- `--manifest-sig <path>` - Путь к manifest.sig (для --install).
- `--release-key <path>` - Путь к release-public.pem для проверки подписи OTA (опционально; без него проверка отключена).
- `--lang <en|ru>` (`-l`) - Язык вывода CLI.
- `--dry-run` (`-d`) - Симулировать действия без выполнения на реальном устройстве.
- `--platform <id>` (`-p`) - Переопределить платформу для сообщений о подключении кабеля (`win-old`, `win-new`, `mac-old`, `mac-new`).
- `--help` (`-h`) - Показать справку и выйти.

Пакетные режимы не открывают графическое окно. Без `--install`, `--restore` или `--uninstall` запускается мастер React.

## Для разработчиков

### Требования

- **Node.js** 18+
- **Rust** 1.70+
- **Platform SDK**: Xcode для macOS, Visual Studio Build Tools для Windows

### Быстрый старт

```bash
# Клонирование репозитория
git clone https://github.com/voboost/voboost-install.git
cd voboost-install

# Установка зависимостей
npm install

# Запуск в режиме разработки (GUI с Tauri)
npm run tauri:dev

# Сборка для продакшена
npm run tauri:build
```

### Структура проекта

```
voboost-install/
├── content/              # Содержимое экранов в виде Markdown файлов
│   ├── 1-welcome-en.md
│   ├── 2-eula-title-en.md
│   └── ...
├── config/               # Файлы конфигурации и настройки инструментов
│   ├── config-commands.json    # Библиотека команд ADB
│   ├── config-install.json     # Сценарий установки
│   ├── config-uninstall.json   # Сценарий удаления
│   ├── config-eula-en.md       # Текст EULA (English)
│   ├── config-eula-ru.md       # Текст EULA (Русский)
│   ├── .env.example            # Шаблон переменных окружения
│   ├── eslint.config.mjs
│   ├── prettier.config.mjs
│   ├── tsconfig.json
│   └── vite.config.ts
├── scripts/              # Вспомогательные скрипты (проверка ADB)
├── src/                  # React фронтенд
│   ├── components/       # Переиспользуемые UI компоненты
│   ├── screens/          # Экраны шагов мастера
│   ├── i18n/             # Файлы переводов JSON
│   ├── store/            # Управление состоянием Zustand
│   ├── services/         # Обертки для backend сервисов
│   └── hooks/            # Кастомные React хуки
├── src-tauri/            # Rust backend
│   ├── src/
│   │   ├── commands/     # Обработчики команд Tauri
│   │   └── utils/        # Вспомогательные функции
│   └── tauri.conf.json   # Конфигурация Tauri
├── tests/                # Тесты
└── docs/                 # Подробная документация
```

### Сборка

```bash
# Сборка для разработки (с Tauri)
npm run tauri:dev

# Сборка для продакшена (создает установщик для платформы)
npm run tauri:build

# Сборка многоархитектурного DMG для macOS (Apple Silicon + Intel)
npm run release

# Проверка качества кода
npm run lint          # Запустить ESLint
npm run format        # Форматировать код с Prettier
npm run typecheck     # Проверка типов TypeScript
```

### Добавление нового языка

Это руководство объясняет, как добавить новый язык в Voboost Installer. В качестве примера мы используем немецкий язык.

#### Обзор

Добавление нового языка требует обновления 9 мест в кодовой базе:

1. Файл i18n JSON
2. Инициализация i18n
3. Определение типа языка
4. Компонент выбора языка
5. Файлы содержимого markdown
6. Компоненты экранов (если не используется помощник)
7. Заголовки команд в конфигурации
8. Rust backend StepTitle
9. Языки установщика NSIS

#### Пошаговое руководство

**1. Создание файла i18n JSON**

Создайте `src/i18n/de.json`, скопировав `src/i18n/en.json` и переведя все значения:

```json
{
    "app": {
        "title": "Voboost Installationsprogramm",
        "version": "Version {{version}}"
    },
    "common": {
        "next": "Weiter",
        "back": "Zurück",
        "exit": "Beenden",
        "retry": "Wiederholen",
        "uninstall": "Deinstallieren"
    },
    "welcome": {
        "button": "Installation starten"
    },
    "eula": {
        "accept": "Ich akzeptiere die Lizenzvereinbarung"
    },
    "download": {
        "button": "Firmware herunterladen",
        "loading": "Versionen werden abgerufen...",
        "fetchError": "Fehler beim Abrufen der Versionen. Bitte überprüfen Sie Ihre Internetverbindung.",
        "localJson": "releases.json auswählen",
        "localApk": "Lokale APK auswählen",
        "downloading": "Herunterladen...",
        "ready": "Firmware erfolgreich heruntergeladen und verifiziert. Bereit zum Fortfahren."
    },
    "install": {
        "button": "Installation starten"
    },
    "complete": {
        "button": "Fertigstellen"
    }
}
```

**2. Обновление инициализации i18n**

Обновите `src/i18n/index.ts`, чтобы включить новый язык:

```typescript
import de from './de.json';

i18n.use(initReactI18next).init({
    resources: {
        en: { translation: en },
        ru: { translation: ru },
        de: { translation: de },  // Добавить новый язык
    },
    lng: 'en',
    fallbackLng: 'en',
});
```

**3. Обновление типа языка**

Обновите `src/store/types.ts`:

```typescript
export type Language = 'en' | 'ru' | 'de';
```

**4. Обновление селектора языка**

Обновите `src/components/LanguageSelector/LanguageSelector.tsx`:

```typescript
const languages = [
    { code: 'en', label: 'English' },
    { code: 'ru', label: 'Русский' },
    { code: 'de', label: 'Deutsch' },
];
```

Также обновите приведение типа в функции `handleChange`:

```typescript
const handleChange = (value: string) => {
    setLanguage(value as 'en' | 'ru' | 'de');
    i18n.changeLanguage(value);
    setOpen(false);
};
```

**5. Создание файлов содержимого markdown**

Создайте немецкие версии всех файлов содержимого в директории `content/`:

- `content/1-welcome-de.md`
- `content/2-eula-title-de.md`
- `content/2-eula-license-de.md`
- `content/3-download-de.md`
- `content/4-connection-de.md`
- `content/4-connection-step1-mac-new-de.md`
- `content/4-connection-step1-mac-old-de.md`
- `content/4-connection-step1-win-new-de.md`
- `content/4-connection-step1-win-old-de.md`
- `content/4-connection-step2-de.md`
- `content/4-connection-step3-de.md`
- `content/5-install-de.md`
- `content/6-complete-de.md`

Каждый файл должен быть переведенной версией своего английского аналога.

**6. Обновление индекса содержимого**

Обновите `src/content/index.ts`, чтобы импортировать и включить новый язык:

```typescript
import { html as welcomeDe } from '../../content/1-welcome-de.md';
import { html as eulaTitleDe } from '../../content/2-eula-title-de.md';
import { html as eulaLicenseDe } from '../../content/2-eula-license-de.md';
import { html as downloadDe } from '../../content/3-download-de.md';
import { html as connectionDe } from '../../content/4-connection-de.md';
import { html as connectionStep1WinNewDe } from '../../content/4-connection-step1-win-new-de.md';
import { html as connectionStep1WinOldDe } from '../../content/4-connection-step1-win-old-de.md';
import { html as connectionStep1MacNewDe } from '../../content/4-connection-step1-mac-new-de.md';
import { html as connectionStep1MacOldDe } from '../../content/4-connection-step1-mac-old-de.md';
import { html as connectionStep2De } from '../../content/4-connection-step2-de.md';
import { html as connectionStep3De } from '../../content/4-connection-step3-de.md';
import { html as installDe } from '../../content/5-install-de.md';
import { html as completeDe } from '../../content/6-complete-de.md';

export const content = {
    welcome: { en: welcomeEn, ru: welcomeRu, de: welcomeDe },
    eulaTitle: { en: eulaTitleEn, ru: eulaTitleRu, de: eulaTitleDe },
    eulaLicense: { en: eulaLicenseEn, ru: eulaLicenseRu, de: eulaLicenseDe },
    download: { en: downloadEn, ru: downloadRu, de: downloadDe },
    connection: { en: connectionEn, ru: connectionRu, de: connectionDe },
    connectionStep1WinNew: { en: connectionStep1WinNewEn, ru: connectionStep1WinNewRu, de: connectionStep1WinNewDe },
    connectionStep1WinOld: { en: connectionStep1WinOldEn, ru: connectionStep1WinOldRu, de: connectionStep1WinOldDe },
    connectionStep1MacNew: { en: connectionStep1MacNewEn, ru: connectionStep1MacNewRu, de: connectionStep1MacNewDe },
    connectionStep1MacOld: { en: connectionStep1MacOldEn, ru: connectionStep1MacOldRu, de: connectionStep1MacOldDe },
    connectionStep2: { en: connectionStep2En, ru: connectionStep2Ru, de: connectionStep2De },
    connectionStep3: { en: connectionStep3En, ru: connectionStep3Ru, de: connectionStep3De },
    install: { en: installEn, ru: installRu, de: installDe },
    complete: { en: completeEn, ru: completeRu, de: completeDe },
} as const;
```

Функции `getContent()` и `getConnectionStep1Content()` в `src/content/index.ts` уже обрабатывают выбор языка с возвратом к английскому, поэтому изменения в компонентах экранов не требуются.

**7. Обновление заголовков команд в конфигурации**

Обновите `config/config-commands.json`, добавив немецкие переводы к каждому заголовку:

```json
{
    "id": "request_root",
    "title": {
        "en": "Requesting root access",
        "ru": "Переключение ADB в режим root",
        "de": "Root-Zugriff anfordern"
    },
    "command": ["adb", "root"],
    "fatal": true,
    "retry_count": 3,
    "retry_delay_secs": 2
}
```

Повторите это для всех команд в файле. Также аналогично обновите `config/config-install.json` и `config/config-uninstall.json`.

**8. Обновление Rust backend StepTitle**

Rust backend использует структуру `StepTitle`, которую необходимо обновить. Подробности о том, как расширить её для новых языков, смотрите в реализации в `src-tauri/src/commands/install.rs`.

**9. Обновление языков установщика NSIS (Windows)**

Обновите `src-tauri/tauri.conf.json`, чтобы включить новый язык в массив языков:

```json
"languages": ["English", "Russian", "German"]
```

#### Проверка

После завершения всех шагов:

1. Запустите `npm run tauri:dev` для тестирования приложения
2. Выберите новый язык в селекторе языка
3. Убедитесь, что весь текст интерфейса отображается правильно
4. Проверьте, что все содержимое markdown загружается корректно
5. Протестируйте процесс установки, чтобы убедиться, что все заголовки шагов переведены

#### Примечания

- Функция `getContent()` в `src/content/index.ts` автоматически возвращается к английскому, если перевод отсутствует
- Всегда тестируйте с выбранным новым языком, чтобы убедиться, что все переводы присутствуют
- Сохраняйте ключи переводов согласованными во всех языковых файлах
- Рассмотрите возможность использования инструментов перевода или услуг для точности

### Редактирование содержимого экранов

Директория `content/` содержит Markdown файлы, которые определяют текст, отображаемый на каждом экране мастера установки. Эти файлы обрабатываются во время сборки и преобразуются в HTML.

#### Соглашение об именовании

Файлы следуют шаблону: `N-screenname-lang.md`

- `N` - Номер шага (1-6)
- `screenname` - Идентификатор экрана (welcome, eula-title, eula-license, download, connection, connection-step1-mac-new, connection-step1-mac-old, connection-step1-win-new, connection-step1-win-old, connection-step2, connection-step3, install, complete)
- `lang` - Код языка (en, ru и т.д.)

#### Пример

Чтобы отредактировать текст приветственного экрана на английском, измените `content/1-welcome-en.md`. Markdown будет автоматически преобразован в HTML и отображен в приложении.

#### Обработка во время сборки

Плагин `vite-plugin-markdown` обрабатывает эти файлы во время сборки. Вывод HTML импортируется в `src/content/index.ts` и используется компонентом `MarkdownBlock`.

### Конфигурация

Директория `config/` содержит файлы конфигурации, которые управляют поведением установщика:

#### config-commands.json

Определяет библиотеку команд ADB с логикой повторных попыток и обработкой ошибок:

```json
{
    "id": "request_root",
    "title": {
        "en": "Requesting root access",
        "ru": "Переключение ADB в режим root"
    },
    "command": ["adb", "root"],
    "fatal": true,
    "retry_count": 3,
    "retry_delay_secs": 2
}
```

- `id` - Уникальный идентификатор команды
- `title` - Отображаемый текст для каждого языка
- `command` - Команда ADB для выполнения
- `fatal` - Должна ли ошибка остановить установку
- `retry_count` - Количество попыток повтора
- `retry_delay_secs` - Задержка между попытками

#### config-install.json

Определяет сценарий установки — последовательность команд для выполнения во время установки.

#### config-uninstall.json

Определяет сценарий удаления — последовательность команд для выполнения во время удаления.

#### .env

Переменные окружения для конфигурации (создайте из `config/.env.example`):

```env
# Frontend (Vite) - URL для загрузки манифеста релизов
VITE_RELEASES_URL=https://raw.githubusercontent.com/voboost/voboost-install/main/releases.json

# Backend (Rust) - переопределить при сборке для замены URL по умолчанию
# RELEASES_URL=https://example.com/releases.json
```

## Стек технологий

| Слой | Технология | Назначение |
|-------|------------|---------|
| Фреймворк | [Tauri 2.x](https://tauri.app/) | Десктопное приложение (Rust + Web) |
| Frontend | React 18 + TypeScript | UI компоненты и логика |
| Сборщик | Vite 6.x | Быстрая сборка и режим разработки |
| UI Библиотека | [Fluent UI React](https://react.fluentui.dev/) | Дизайн-система от Microsoft |
| Состояние | [Zustand](https://zustand-demo.pmnd.rs/) | Легковесное управление состоянием |
| Локализация | [react-i18next](https://react.i18next.com/) | Поддержка языков |
| Backend | Rust | Системные операции (ADB, установка, fail-safes) |

## Последовательность установки через ADB

Инсталлятор выполняет следующие команды ADB, чтобы безопасно установить Voboost APK в мультимедийную среду автомобиля:

1. `adb wait-for-device` & `adb root` (Получение прав суперпользователя)
2. `adb disable-verity` (Отключение проверки целостности системы)
3. `adb reboot` (Перезагрузка системы)
4. `adb wait-for-device` & `adb root` (Повторное получение root после перезагрузки)
5. `adb remount` (Перемонтирование файловой системы на запись)
6. `adb shell setenforce 0` (Отключение разрешительного режима SELinux)
7. `adb install -g -r -d <apk>` (Установка APK с автоматическим downgrade там, где это не заблокировано)
8. **Выдача прав (Permissions Phase)**: Последовательное применение `appops` (`REQUEST_INSTALL_PACKAGES`) и `pm grant` (`SYSTEM_ALERT_WINDOW`, `WRITE_SECURE_SETTINGS`, `READ_LOGS`, `RECORD_AUDIO`, `WRITE_EXTERNAL_STORAGE`).
9. **Настройка окружения (Environment Phase)**: Отключение ограничений Hidden API (`hidden_api_policy_pre_p_apps`, `hidden_api_policy_p_apps`) и принудительное включение freeform окон (`enable_freeform_support`, `force_resizable_activities`).

**Примечание к обработке сбоев:** Все шаги управляются механизмом повторных попыток (retries). Критические шаги (например, `adb remount`) вызывают жесткий выход из скрипта, если лимит попыток исчерпан, тогда как некритические ошибки (`hidden_api_policy`) игнорируются, а процесс продолжается с логированием.

## Безопасность

- **Белый список команд ADB**: Rust привязан к выполнению строго ограниченных команд: `start-server`, `devices`, `wait-for-device`, `root`, `remount`, `disable-verity`, `install`, `reboot`, `shell`, `uninstall`.
- **Проверка пакета**: Все скачивания сверяются по хеш-сумме SHA256 согласно манифесту `releases.json`.
- **Отсутствие телеметрии**: Никакие данные не передаются и не собираются в процессе установки программы.

## Устранение неполадок

### Распространенные проблемы

**Устройство не обнаруживается**
- Убедитесь, что отладка по USB включена на устройстве
- Проверьте, что устройство авторизовано для подключения ADB
- Попробуйте другой USB кабель или порт

**Установка не удается с ошибкой понижения версии**
- Установщик автоматически обрабатывает сценарии `INSTALL_FAILED_VERSION_DOWNGRADE`
- Если проблема сохраняется, сначала вручную удалите старую версию

**Ошибки отказа в доступе**
- Убедитесь, что устройство находится в режиме root
- Проверьте, что SELinux отключен (`adb shell setenforce 0`)

**Сборка не удается на macOS**
- Убедитесь, что установлены инструменты командной строки Xcode: `xcode-select --install`
- Проверьте, что Rust установлен правильно: `rustc --version`

**Сборка не удается на Windows**
- Убедитесь, что установлены Visual Studio Build Tools
- Проверьте, что Rust установлен правильно: `rustc --version`

Для более подробной информации по устранению неполадок см. [docs/16-troubleshooting.md](docs/16-troubleshooting.md).

## Лицензия

Двойная лицензия:

- [PolyForm Noncommercial 1.0.0](https://github.com/voboost/voboost-license/blob/main/LICENSE.ru.md) — бесплатно для личного использования
- [Коммерческая лицензия](https://github.com/voboost/voboost-license/blob/main/COMMERCIAL.ru.md) — требуется для любого коммерческого использования
