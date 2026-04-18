import atom from '@/assets/atom.svg'
import ghost from '@/assets/ghost.png'
import hugo from '@/assets/hugo.png'
import rss from '@/assets/rss.svg'
import typecho from '@/assets/typecho.png'
import wordpress from '@/assets/wordpress.svg'
import type { Provider } from '@/types'
import { defineAsyncComponent } from 'vue'

// 新增的迁移数据来源，需要在此处进行注册
export const providerItems: Provider[] = [
  {
    name: 'Halo 1.x',
    icon: 'https://www.halo.run/logo',
    description: 'Halo 1.5 / 1.6 数据迁移',
    importComponent: defineAsyncComponent(() => import('./halo/HaloMigrateDataParser.vue')),
    options: {
      attachmentFolderPath: 'migrate-from-1.x',
      attachmentHandlerDescriptions: {
        localUploadTitle: '上传到 Halo',
        localUploadDescription: '选择本地附件文件夹，自动上传并替换链接',
        localUploadHint:
          '请选择包含 Halo 1.x 附件目录的文件夹，系统会在开始导入时自动匹配文章中的图片链接并上传，这种方式可能会导致旧网站的资源链接地址发生改变。',
        localManualTitle: '手动迁移',
        localManualDescription: '需要将旧的附件目录移动到 Halo 工作目录',
        localManualHint:
          '选择本地存储策略后，系统只会创建附件记录。你需要自行将原站点附件目录移动到 Halo 工作目录中。'
      }
    }
  },
  {
    name: 'WordPress',
    icon: wordpress,
    description: 'WordPress WXR 数据迁移',
    importComponent: defineAsyncComponent(
      () => import('./wordpress/WordPressMigrateDataParser.vue')
    ),
    options: {
      attachmentFolderPath: 'migrate-from-wp'
    }
  },
  {
    name: 'Ghost',
    icon: ghost,
    description: '从 Ghost 博客平台迁移',
    importComponent: defineAsyncComponent(() => import('./ghost/GhostMigrateDataParser.vue')),
    options: {
      attachmentFolderPath: 'migrate-from-ghost',
      attachmentHandlerDescriptions: {
        localUploadTitle: '上传到 Halo',
        localUploadDescription: '选择 Ghost content 目录或其子目录，自动上传并替换链接',
        localUploadHint:
          '请选择 Ghost content 目录或其中包含 images/files 的任意目录，系统会根据 content/images 和 content/files 路径尽量匹配本地文件并上传。',
        localManualTitle: '手动迁移',
        localManualDescription: '保留 Ghost 原始媒体路径，自行迁移 content 目录',
        localManualHint:
          '系统只会创建附件记录，不会上传文件。你需要自行迁移 Ghost 的 content 目录，并确保文章中引用的原始媒体路径仍然可访问。'
      }
    }
  },
  {
    name: 'Typecho',
    icon: typecho,
    description: '从 Typecho 博客平台迁移',
    importComponent: defineAsyncComponent(() => import('./typecho/TypechoMigrateDataParser.vue')),
    options: {
      attachmentFolderPath: 'migrate-from-typecho',
      attachmentHandlerDescriptions: {
        localUploadTitle: '上传到 Halo',
        localUploadDescription: '选择 Typecho 附件目录，自动上传并替换链接',
        localUploadHint:
          '请选择 Typecho 站点根目录、usr 目录或其中包含 uploads 的任意目录，系统会根据 usr/uploads 路径尽量匹配本地文件并上传。',
        localManualTitle: '手动迁移',
        localManualDescription: '保留 Typecho 原始附件路径，自行迁移 usr/uploads 目录',
        localManualHint:
          '系统只会创建附件记录，不会上传文件。你需要自行迁移 Typecho 的 usr/uploads 目录，并确保文章中引用的原始附件路径仍然可访问。'
      }
    }
  },
  {
    name: 'RSS',
    icon: rss,
    description: '基于 RSS 订阅文件的数据迁移',
    importComponent: defineAsyncComponent(() => import('./rss/RssMigrateDataParser.vue'))
  },
  {
    name: 'Atom Feed',
    icon: atom,
    description: '基于 Atom Feed 订阅文件的数据迁移',
    importComponent: defineAsyncComponent(() => import('./atom/AtomMigrateDataParser.vue'))
  },
  {
    name: 'Hugo',
    icon: hugo,
    description: '从 HUGO 静态博客生成器迁移',
    importComponent: defineAsyncComponent(() => import('./hugo/HugoMigrateDataParser.vue')),
    options: {
      attachmentFolderPath: 'migrate-from-hugo'
    }
  }
]

export function getProviderByName(name?: string) {
  return providerItems.find((provider) => provider.name === name)
}
