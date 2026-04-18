import type { MigrateData } from '@/types'

export interface HaloRequiredPlugin {
  key: string
  name: string
  storeUrl: string
}

const REQUIRED_PLUGINS: Record<string, HaloRequiredPlugin> = {
  moments: {
    key: 'PluginMoments',
    name: '瞬间',
    storeUrl: 'https://www.halo.run/store/apps/app-SnwWD'
  },
  photos: {
    key: 'PluginPhotos',
    name: '图库',
    storeUrl: 'https://www.halo.run/store/apps/app-BmQJW'
  },
  links: {
    key: 'PluginLinks',
    name: '链接',
    storeUrl: 'https://www.halo.run/store/apps/app-hfbQg'
  }
}

export function getMissingHaloPlugins(
  data: MigrateData | undefined,
  activatedPluginNames: string[]
): HaloRequiredPlugin[] {
  if (!data) {
    return []
  }

  const requiredPlugins: HaloRequiredPlugin[] = []

  if (data.moments?.length) {
    requiredPlugins.push(REQUIRED_PLUGINS.moments)
  }

  if (data.photos?.length) {
    requiredPlugins.push(REQUIRED_PLUGINS.photos)
  }

  if (data.links?.length) {
    requiredPlugins.push(REQUIRED_PLUGINS.links)
  }

  return requiredPlugins.filter((plugin) => !activatedPluginNames.includes(plugin.key))
}
