# Repository Guidelines

## Project Structure & Module Organization

This is a Halo migration plugin. The root Gradle project packages the plugin and contains the small Java backend in `src/main/java/run/halo/migrate`. Plugin metadata, roles, and static resources live in `src/main/resources`. The frontend is the main application surface under `ui/`, with Vue 3 source in `ui/src`, provider-specific parsers in `ui/src/modules/<provider>/`, shared components in `ui/src/components`, composables in `ui/src/composables`, and unit tests in `ui/tests`. Images and documentation live in `images/` and `docs/`; read `docs/provider.md` before adding a migration provider.

## Build, Test, and Development Commands

- `./gradlew pnpmInstall`: install frontend dependencies through Gradle.
- `./gradlew build`: build Java and UI, then copy the UI bundle into the plugin resources.
- `./gradlew check`: run verification tasks, including UI unit tests through `:ui:pnpmCheck`.
- `./gradlew test`: run Java/JUnit tests.
- `./gradlew haloServer`: start a local Halo Docker environment with this plugin loaded.
- `cd ui && pnpm dev`: run the UI bundler in development watch mode.
- `cd ui && pnpm type-check && pnpm test:unit`: run frontend type checks and Rstest unit tests directly.

Use Java 21, Node 24, and pnpm 10, matching README and CI.

## Coding Style & Naming Conventions

Follow `.editorconfig` for root files: UTF-8, LF line endings, spaces, Java max line length 100. UI code follows the Prettier config in `ui/package.json`: 2 spaces, single quotes, no semicolons, print width 100, and organized imports. Use Vue 3 Composition API patterns already present in `ui/src`. Name provider directories in lowercase, for example `ui/src/modules/wordpress`, and keep provider-specific parsing inside that directory. Register providers centrally in `ui/src/modules/index.ts`.

## Testing Guidelines

Frontend tests use Rstest with `jsdom`; add tests as `ui/tests/*.test.ts` and keep shared fixtures in `ui/tests/fixtures`. When adding parser logic, cover representative source data and edge cases before wiring UI behavior. Java tests should go under `src/test/java` and run with JUnit Platform. No coverage threshold is configured, so validate behavior with targeted tests and the relevant Gradle or pnpm command.

## Commit & Pull Request Guidelines

Recent history mixes concise imperative commits and Conventional Commits, especially `fix: ...`. Prefer a focused subject such as `fix: handle empty WordPress exports` or `Add Markdown attachment tests`. Pull requests should describe the affected provider or workflow, link related issues, include screenshots for UI changes, and list validation commands run. Keep changes surgical; do not refactor shared migration flow unless the task requires it.

