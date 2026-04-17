# Copilot Instructions

## Build, test, and lint commands

### Root project (Gradle / Java 21)

```bash
./gradlew build
./gradlew test
./gradlew test --tests "run.halo.migrate.SomeTest"
./gradlew haloServer
./gradlew pnpmInstall
```

- `./gradlew build` also builds `ui/` and copies the frontend bundle into `build/resources/main/console/`.
- `./gradlew haloServer` starts a Halo Docker environment with the plugin loaded.

### Frontend (`ui/`, pnpm / Node 24)

```bash
cd ui
pnpm install
pnpm build
pnpm dev
pnpm lint
pnpm prettier
pnpm type-check
```

## High-level architecture

- This repository is a Halo plugin with a **minimal Java backend** and a **browser-heavy Vue 3 frontend**. The root Gradle project packages the plugin; the `ui/` subproject contains the migration UI and most of the logic.
- The Java side is intentionally small: `MigratePlugin` is the plugin entry point, and `MigrationController` only exposes `POST /migrations/rss-parse` so the frontend can fetch remote RSS/Atom content without browser CORS issues.
- The frontend is registered through `ui/src/index.ts`, which adds the `/migrate` routes to Halo Console. The main user flow is:
  1. `SelectProviderView.vue` lets the user choose a source platform.
  2. A provider parser component in `ui/src/modules/<provider>/` reads export files and converts them into a shared `MigrateData` shape.
  3. Attachment handling runs before import: most providers use `MigrateAttachmentHandler.vue`, Halo uses `HaloMigrateAttachmentHandler.vue`, and local media URL rewriting happens in `use-attachment-preprocessor.ts`.
  4. `use-migrate-task.ts` turns `MigrateData` into `MigrateTaskGroup[]`, and `MigrateView.vue` executes those tasks with `fastq` at concurrency `9`.
- `use-migrate-task.ts` maps each migrated content type directly to Halo APIs: tags/categories/comments/attachments use generated core clients, post/page imports use console draft APIs, and plugin resources without generated clients (moments, photos, links) go through `axiosInstance`.

## Key conventions

- **UnoCSS compile-class mode is enabled.** Inline utility classes in Vue templates use the `:uno:` prefix, for example `class=":uno: flex items-center gap-2"`.
- **New migration providers are registered centrally.** Add the provider entry in `ui/src/modules/index.ts`, then implement its parser UI under `ui/src/modules/<provider>/`.
- **Provider parser components are write-only.** They should emit `update:data` with a `MigrateData` payload and expose `reset()` for `MigrateView.vue` to call. The shared extension docs in `docs/extend/provider.md` describe this contract.
- **Attachment handling is shared unless the provider is Typecho.** Most providers feed attachments through `MigrateAttachmentHandler.vue`; Typecho owns its own remote attachment migration flow inside `TypechoMigrateDataParser.vue`.
- **Attachment migration behavior depends on the selected strategy.** Local upload mode removes `LOCAL` attachments from the final attachment task list and rewrites referenced URLs after uploading files; manual mode only creates Halo attachment records with the selected storage policy.
- **Provider-specific attachment paths matter.** `providerItems` can set `options.attachmentFolderPath`; `use-migrate-task.ts` uses that to build local attachment annotations such as `migrate-from-1.x/...` and `migrate-from-wp/...`.
- **Keep API client usage consistent with existing code.**
  - `coreApiClient`: tags, categories, comments, replies, attachments, menus, storage policies.
  - `consoleApiClient`: draft post/page creation, current user lookup, plugin listing, console attachment upload.
  - `axiosInstance`: moments, photos, and links endpoints that do not have generated client methods.
- **Do not change task queue concurrency casually.** Import execution in `MigrateView.vue` uses `fastq.promise(asyncWorker, 9)`, which is tuned for current Halo API behavior.
