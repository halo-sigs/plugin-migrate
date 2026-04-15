import type mdit from 'markdown-it'
import type Token from 'markdown-it/lib/token.mjs'
import type Renderer from 'markdown-it/lib/renderer.mjs'
import type { Options } from 'markdown-it'

/**
 * The plugin for markdown-it to add `id` attribute to each <h> element.
 *
 * The generated IDs are globally unique, which means you may want to use different md instances for different pages.
 *
 * Example:
 * ```ts
 * import markdownit from "markdown-it";
 * import MarkdownItIdPlugin from "@/modules/hugo/markdown-it-id";
 *
 * markdownit().use(MarkdownItIdPlugin)
 * ```
 *
 * @param md
 * @constructor
 */
export default function MarkdownItIdPlugin(md: mdit) {
  const proxy = (tokens: Token[], idx: number, options: Options, _: unknown, self: Renderer) =>
    self.renderToken(tokens, idx, options)
  const defaultHeadingOpenRenderer = md.renderer.rules.heading_open || proxy

  const ids = new Set<string>()

  function generateId(text: string): string {
    let s = text
      .trim()
      .replaceAll(/\p{Emoji_Presentation}/gu, '')
      .replaceAll(' ', '-')

    if (ids.has(s)) {
      let i = 1
      while (ids.has(`${s}-${i}`)) {
        i++
      }
      s = `${s}-${i}`
    }
    ids.add(s)
    return s
  }

  /**
   *
   * @param tokens  list of all tokens being parsed
   * @param idx  number that corresponds to the key of the current token in tokens
   * @param options the options defined when creating the new markdown-it object ({} in our case)
   * @param env
   * @param self a reference to the renderer itself
   */
  md.renderer.rules.heading_open = (
    tokens: Token[],
    idx: number,
    options: Options,
    env: unknown,
    self: Renderer
  ): string => {
    const nextToken = idx + 1 >= tokens.length ? undefined : tokens[idx + 1]
    if (!nextToken || nextToken.type !== 'inline' || !nextToken.children) {
      // no content tokens for current heading
      return defaultHeadingOpenRenderer(tokens, idx, options, env, self)
    }
    const text = self.render(nextToken.children, options, env)
    tokens[idx].attrSet('id', generateId(text))
    return defaultHeadingOpenRenderer(tokens, idx, options, env, self)
  }
}
