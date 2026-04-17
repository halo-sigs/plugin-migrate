import type { MigrateAttachment, MigrateData } from '@/types'
import { cloneMigrateData, replaceUrlsInMigrateData } from '@/utils/migrate-data-media'
import { uploadAttachment } from './use-typecho-data-parser'

interface TypechoAttachmentMigrationResult {
  data: MigrateData
  failedAttachments: MigrateAttachment[]
  migratedCount: number
}

export async function migrateTypechoAttachments(
  data: MigrateData,
  attachments: MigrateAttachment[],
  attachmentBaseURL: string
): Promise<TypechoAttachmentMigrationResult> {
  const nextData = cloneMigrateData(data)
  const urlMap = new Map<string, string>()
  const failedAttachments: MigrateAttachment[] = []

  for (const attachment of attachments) {
    const oldUrl = attachmentBaseURL + attachment.path

    try {
      const res = await uploadAttachment(attachment.name, oldUrl)
      const newUrl = res.data.metadata.annotations?.['storage.halo.run/uri']

      if (!newUrl) {
        throw new Error('迁移成功但未返回新的附件地址')
      }

      urlMap.set(oldUrl, newUrl)
    } catch (error) {
      console.error(`附件 ${attachment.name} 上传失败:`, error)
      failedAttachments.push(attachment)
    }
  }

  replaceUrlsInMigrateData(nextData, urlMap)

  return {
    data: nextData,
    failedAttachments,
    migratedCount: attachments.length - failedAttachments.length
  }
}
