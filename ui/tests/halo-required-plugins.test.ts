import { getMissingHaloPlugins } from '@/modules/halo/halo-required-plugins'
import { describe, expect, it } from '@rstest/core'

describe('getMissingHaloPlugins', () => {
  it('returns only plugins required by the parsed halo data and not yet activated', () => {
    const missing = getMissingHaloPlugins(
      {
        moments: [{ metadata: { name: 'm1' } } as any],
        photos: [{ metadata: { name: 'p1' } } as any],
        links: [{ metadata: { name: 'l1' } } as any]
      },
      ['PluginPhotos']
    )

    expect(missing).toEqual([
      expect.objectContaining({ key: 'PluginMoments', name: '瞬间' }),
      expect.objectContaining({ key: 'PluginLinks', name: '链接' })
    ])
  })

  it('returns an empty list when there is no parsed data', () => {
    expect(getMissingHaloPlugins(undefined, [])).toEqual([])
  })
})
