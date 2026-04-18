# Markdown provider design

## Problem

The current `Hugo` provider is modeled around Hugo-specific ZIP content and section mapping, but the real migration need is broader: import markdown content from static blog generators such as Hugo, Hexo, and similar systems where the source is essentially markdown files plus frontmatter and local attachments. The existing design makes provider UI and parsing logic more Hugo-specific than necessary, and it does not align with the newer shared attachment-processing pipeline.

## Goals

1. Replace the `Hugo` provider with a generic `Markdown` provider.
2. Support single markdown files and directories containing markdown files.
3. Support common frontmatter formats and metadata fields used by static blog generators.
4. Keep the final import path aligned with the existing shared `MigrateData -> attachment preparation -> task generation -> task execution` flow.
5. Preserve current migration UI patterns: migration tip, source selection, data overview, attachment handling, and next step.

## Non-goals

1. Preserve Hugo-specific compatibility or section-based configuration.
2. Parse generator config files or infer advanced site structure.
3. Upload attachments directly inside the provider.
4. Add dedicated providers for Hexo or other markdown-based generators at this stage.

## Chosen approach

The current `ui/src/modules/hugo/` module will be renamed and restructured as `ui/src/modules/markdown/`. The provider entry in `ui/src/modules/index.ts` will also change from `Hugo` to `Markdown`, with copy that explicitly covers Hugo, Hexo, and similar markdown-plus-frontmatter sources.

The provider will be split into four clear responsibilities:

1. `MarkdownMigrateDataParser.vue`
   - Provider-local UI only.
   - Lets the user select a single markdown file or a directory containing markdown files.
   - Lets the user continue using the existing shared attachment handler by selecting an optional attachment directory later in the flow.
   - Emits parsed `MigrateData` and exposes `reset()`.
2. `use-markdown-data-parser.ts`
   - Orchestrates parsing of `File[]`.
   - Converts normalized markdown documents into `MigrateData`.
   - Generates posts, pages, tags, categories, and local attachment records.
3. `markdown-frontmatter.ts`
   - Reads and normalizes YAML, TOML, and JSON frontmatter.
   - Maps common metadata fields into a stable internal shape.
4. `markdown-attachments.ts`
   - Extracts local resource references from markdown and embedded HTML.
   - Produces `LOCAL` attachments without uploading files.

## Data flow

The provider UI collects one or more markdown files. For directory selection, it scans the selected tree and keeps only markdown files. The parser reads each file, extracts frontmatter and body, normalizes the metadata, determines whether the file represents a post or a single page, renders markdown to HTML, and adds any discovered local references to `attachments`.

Each parsed document is converted into the existing migration model:

- `posts` or `pages`
- `tags`
- `categories`
- `attachments`

The result remains provider-agnostic once emitted. Shared attachment preparation continues to handle attachment folder selection, file matching, upload, and URL rewriting.

## Metadata mapping

The parser should be permissive on input and strict on output:

- `title`: prefer `title`, fall back to file name.
- `slug`: prefer `slug`, otherwise generate from title or file name.
- `excerpt`: prefer `excerpt`, then `description`, then `summary`; otherwise auto-generate.
- `categories`: accept `categories` or `category`, as string or string array.
- `tags`: accept `tags` or `tag`, as string or string array.
- `publishTime`: prefer `date`, then common aliases such as `publishDate`, `published`, `created`, `createdAt`.
- `publish`: derived from `draft`; `draft: true` means not published.
- content kind: default to post; only treat a file as page when `type`, `layout`, or `kind` explicitly indicates `page`.

The stored content remains markdown-first:

- `content.raw` keeps the original markdown body.
- `content.rawType` stays `markdown`.
- `content.content` stores rendered HTML for import.

## Attachment handling

The parser only recognizes local resources. It should extract:

1. Markdown image references.
2. Markdown links that point to local files.
3. Embedded HTML media/image references such as `<img>`, and other local `src`/`href` values where appropriate.

It should ignore:

1. `http://` and `https://`
2. `data:`
3. `mailto:`
4. `#fragment`

Each discovered local resource becomes a `LOCAL` attachment record that preserves:

- the original referenced URL
- the normalized path to match against the chosen attachment directory later

This keeps attachment upload and URL replacement inside the shared migration pipeline.

## Error handling

Parsing errors should be explicit. If a file has invalid frontmatter syntax, parsing stops and the UI should surface the file name together with the parsing error. Files without `title` are still valid because the parser can fall back to the file name. Silent skipping of malformed files is out of scope.

## Testing

The refactor should be covered primarily through logic-level tests:

1. frontmatter parsing for YAML, TOML, and JSON
2. metadata normalization and alias handling
3. default post classification and explicit page classification
4. directory and single-file parsing
5. category and tag normalization
6. excerpt and publish-time precedence
7. local attachment extraction
8. ignoring remote resources
9. stable final `MigrateData` output

Vue SFC tests are not required for this step.
