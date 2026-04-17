import type {
  Counter,
  MigrateAttachment,
  MigrateComment,
  MigrateData,
  MigrateReply,
  MigrateTaskGroup,
  MigrateTaskItem
} from '@/types'
import {
  axiosInstance,
  consoleApiClient,
  coreApiClient,
  type Attachment,
  type Category,
  type Comment,
  type Reply,
  type User
} from '@halo-dev/api-client'
import type { AxiosResponse } from 'axios'
import { groupBy } from 'es-toolkit'

function createTaskItem<T>(
  id: string,
  type: string,
  label: string,
  item: T,
  run: () => Promise<AxiosResponse<any, any>>
): MigrateTaskItem<T> {
  return {
    id,
    type,
    label,
    item,
    status: 'pending',
    run,
    retry: () => {}
  }
}

function buildCounterTask(counter: Counter, name: string): MigrateTaskItem<Counter> {
  return createTaskItem(`counter-${name}`, 'counter', '统计数据', counter, () =>
    coreApiClient.metrics.counter.createCounter({
      counter: {
        visit: counter.visit || 0,
        upvote: counter.upvote || 0,
        downvote: counter.downvote || 0,
        totalComment: 0,
        approvedComment: counter.approvedComment || 0,
        apiVersion: 'metrics.halo.run/v1alpha1',
        kind: 'Counter',
        metadata: { name }
      }
    })
  )
}

function buildLocalAttachmentTask(
  item: MigrateAttachment,
  policyName: string,
  ownerName: string,
  relativePathFolder: string
): MigrateTaskItem<MigrateAttachment> {
  let relativePath = item.path
  if (item.path.startsWith('upload/')) {
    relativePath = relativePath.replace('upload/', '')
  }
  const attachment: Attachment = {
    apiVersion: 'storage.halo.run/v1alpha1',
    kind: 'Attachment',
    metadata: {
      name: String(item.id),
      annotations: {
        'storage.halo.run/local-relative-path': `${relativePathFolder}/${relativePath}`,
        'storage.halo.run/uri': `/${item.path}`,
        'storage.halo.run/suffix': `${item.suffix}`,
        'storage.halo.run/width': `${item.width}`,
        'storage.halo.run/height': `${item.height}`
      }
    },
    spec: {
      displayName: `${item.name}`,
      groupName: `${item.groupName || ''}`,
      ownerName: `${ownerName}`,
      policyName: `${policyName}`,
      mediaType: `${item.mediaType || ''}`,
      size: Number.parseInt(`${item.size}`),
      tags: item.tags
    }
  }
  return createTaskItem(String(item.id), 'attachment', item.name, item, () =>
    coreApiClient.storage.attachment.createAttachment({ attachment })
  )
}

function buildS3OSSAttachmentTask(
  item: MigrateAttachment,
  policyName: string,
  ownerName: string
): MigrateTaskItem<MigrateAttachment> {
  const attachment: Attachment = {
    apiVersion: 'storage.halo.run/v1alpha1',
    kind: 'Attachment',
    metadata: {
      name: String(item.id),
      annotations: {
        's3os.plugin.halo.run/object-key': `${item.fileKey}`,
        'storage.halo.run/external-link': `${item.path}`,
        'storage.halo.run/suffix': `${item.suffix}`,
        'storage.halo.run/width': `${item.width}`,
        'storage.halo.run/height': `${item.height}`
      }
    },
    spec: {
      displayName: `${item.name}`,
      groupName: `${item.groupName || ''}`,
      ownerName: `${ownerName}`,
      policyName: `${policyName}`,
      mediaType: `${item.mediaType || ''}`,
      size: Number.parseInt(`${item.size}`),
      tags: item.tags
    }
  }
  return createTaskItem(String(item.id), 'attachment', item.name, item, () =>
    coreApiClient.storage.attachment.createAttachment({ attachment })
  )
}

function buildNoSupportAttachmentTask(item: MigrateAttachment): MigrateTaskItem<MigrateAttachment> {
  return createTaskItem(String(item.id), 'attachment', item.name, item, () =>
    Promise.reject(new Error('尚未支持 【' + item.type + '】 类型的附件迁移'))
  )
}

export function useMigrateTask(
  data: MigrateData,
  options: {
    relativePathFolder?: string
    user?: User
    typeToPolicyMap?: Map<string, string>
  } = {}
): MigrateTaskGroup[] {
  const { relativePathFolder, user, typeToPolicyMap } = options

  // Tags
  const tagTasks = (data.tags || []).map((tag) =>
    createTaskItem(
      tag.metadata?.name || tag.spec?.displayName || 'unknown',
      'tag',
      tag.spec?.displayName || tag.metadata?.name || '未命名标签',
      tag,
      () => coreApiClient.content.tag.createTag({ tag })
    )
  )

  // Categories
  const categoryTasks = (data.categories || []).map((category) =>
    createTaskItem(
      category.metadata?.name || category.spec?.displayName || 'unknown',
      'category',
      category.spec?.displayName || category.metadata?.name || '未命名分类',
      category,
      () => coreApiClient.content.category.createCategory({ category: category as Category })
    )
  )

  // Posts
  const postTasks: MigrateTaskItem<any>[] = []
  ;(data.posts || []).forEach((post) => {
    postTasks.push(
      createTaskItem(
        post.postRequest.post?.metadata?.name || post.postRequest.post?.spec?.title || 'unknown',
        'post',
        post.postRequest.post?.spec?.title || post.postRequest.post?.metadata?.name || '未命名文章',
        post,
        () => consoleApiClient.content.post.draftPost({ postRequest: post.postRequest })
      )
    )
    if (post.counter) {
      postTasks.push(
        buildCounterTask(
          post.counter,
          `posts.content.halo.run/${post.postRequest.post?.metadata?.name}`
        )
      )
    }
  })

  // Pages
  const pageTasks: MigrateTaskItem<any>[] = []
  ;(data.pages || []).forEach((page) => {
    pageTasks.push(
      createTaskItem(
        page.singlePageRequest.page?.metadata?.name ||
          page.singlePageRequest.page?.spec?.title ||
          'unknown',
        'page',
        page.singlePageRequest.page?.spec?.title ||
          page.singlePageRequest.page?.metadata?.name ||
          '未命名页面',
        page,
        () =>
          consoleApiClient.content.singlePage.draftSinglePage({
            singlePageRequest: page.singlePageRequest
          })
      )
    )
    if (page.counter) {
      pageTasks.push(
        buildCounterTask(
          page.counter,
          `singlepages.content.halo.run/${page.singlePageRequest.page?.metadata?.name}`
        )
      )
    }
  })

  // Comments & Replies
  const commentTasks: MigrateTaskItem<any>[] = []
  ;(data.comments || []).forEach((comment) => {
    const c = comment as any
    const isComment =
      (comment as MigrateComment).kind === 'Comment' || (c?.spec && 'comment' in c.spec)
    if (isComment) {
      commentTasks.push(
        createTaskItem(
          (comment as MigrateComment).metadata?.name || 'unknown',
          'comment',
          (comment as MigrateComment).spec?.owner?.displayName ||
            (comment as MigrateComment).metadata?.name ||
            '评论',
          comment as MigrateComment,
          () =>
            coreApiClient.content.comment.createComment({
              comment: comment as Comment
            })
        )
      )
    } else {
      commentTasks.push(
        createTaskItem(
          (comment as MigrateReply).metadata?.name || 'unknown',
          'reply',
          (comment as MigrateReply).spec?.owner?.displayName ||
            (comment as MigrateReply).metadata?.name ||
            '回复',
          comment as MigrateReply,
          () =>
            coreApiClient.content.reply.createReply({
              reply: comment as Reply
            })
        )
      )
    }
  })

  // Menus
  const menuTasks: MigrateTaskItem<any>[] = []
  const menus = data.menuItems || []
  const groupedMenus = groupBy(menus, (item) => item.groupId)
  Object.entries(groupedMenus).forEach(([key, items]) => {
    const itemNames = items.map((item) => item.menu.metadata?.name).filter(Boolean) as string[]
    const menuName = items[0]?.groupName || key
    menuTasks.push(
      createTaskItem(
        String(key || 'default'),
        'menu',
        menuName ? String(menuName) : '未分组',
        String(key || 'default'),
        () =>
          coreApiClient.menu.createMenu({
            menu: {
              kind: 'Menu',
              apiVersion: 'v1alpha1',
              metadata: { name: key ? String(key) : 'default' },
              spec: {
                displayName: menuName ? String(menuName) : '未分组',
                menuItems: itemNames
              }
            }
          })
      )
    )
  })
  menus.forEach((item) => {
    menuTasks.push(
      createTaskItem(
        item.menu.metadata?.name || 'unknown',
        'menuItem',
        item.menu.spec?.displayName || item.menu.metadata?.name || '未命名菜单项',
        item,
        () => coreApiClient.menuItem.createMenuItem({ menuItem: item.menu })
      )
    )
  })

  // Moments
  const momentTasks = (data.moments || []).map((moment) =>
    createTaskItem(
      moment.metadata?.name || 'unknown',
      'moment',
      moment.metadata?.name || '日志',
      moment,
      () => axiosInstance.post('/apis/console.api.moment.halo.run/v1alpha1/moments', moment)
    )
  )

  // Photos
  const photoTasks: MigrateTaskItem<any>[] = []
  const photos = data.photos || []
  const groupedPhotos = groupBy(photos, (item) => item.spec?.groupName || '')
  Object.keys(groupedPhotos).forEach((key) => {
    photoTasks.push(
      createTaskItem(key || 'default', 'photoGroup', key || '未分组', key || 'default', () =>
        axiosInstance.post('/apis/core.halo.run/v1alpha1/photogroups', {
          spec: { displayName: key || '未分组', priority: 0 },
          metadata: { name: key || 'default' },
          kind: 'PhotoGroup',
          apiVersion: 'core.halo.run/v1alpha1'
        })
      )
    )
  })
  photos.forEach((item) => {
    photoTasks.push(
      createTaskItem(
        item.metadata?.name || 'unknown',
        'photo',
        item.spec?.displayName || item.metadata?.name || '未命名图片',
        item,
        () => axiosInstance.post('/apis/core.halo.run/v1alpha1/photos', item)
      )
    )
  })

  // Links
  const linkTasks: MigrateTaskItem<any>[] = []
  const links = data.links || []
  const groupedLinks = groupBy(links, (item) => item.spec?.groupName || '')
  Object.keys(groupedLinks).forEach((key) => {
    linkTasks.push(
      createTaskItem(key || 'default', 'linkGroup', key || '未分组', key || 'default', () =>
        axiosInstance.post('/apis/core.halo.run/v1alpha1/linkgroups', {
          spec: { displayName: key || '未分组', priority: 0, links: [] },
          metadata: { name: key || 'default' },
          kind: 'LinkGroup',
          apiVersion: 'core.halo.run/v1alpha1'
        })
      )
    )
  })
  links.forEach((item) => {
    linkTasks.push(
      createTaskItem(
        item.metadata?.name || 'unknown',
        'link',
        item.spec?.displayName || item.metadata?.name || '未命名链接',
        item,
        () => axiosInstance.post('/apis/core.halo.run/v1alpha1/links', item)
      )
    )
  })

  // Attachments
  const attachmentTasks: MigrateTaskItem<MigrateAttachment>[] = []
  const attachments = data.attachments || []
  if (user && typeToPolicyMap && typeToPolicyMap.size > 0) {
    const userName = user.metadata?.name || ''
    attachments.forEach((item) => {
      const policyName = typeToPolicyMap.get(item.type) || 'default-policy'
      switch (item.type) {
        case 'LOCAL':
          attachmentTasks.push(
            buildLocalAttachmentTask(item, policyName, userName, relativePathFolder || '')
          )
          break
        case 'ALIOSS':
        case 'BAIDUBOS':
        case 'TENCENTCOS':
        case 'QINIUOSS':
        case 'UPOSS':
          attachmentTasks.push(buildS3OSSAttachmentTask(item, policyName, userName))
          break
        default:
          attachmentTasks.push(buildNoSupportAttachmentTask(item))
      }
    })
  }

  const groups: MigrateTaskGroup[] = [
    { key: 'tags', label: '标签', tasks: tagTasks },
    { key: 'categories', label: '分类', tasks: categoryTasks },
    { key: 'posts', label: '文章', tasks: postTasks },
    { key: 'pages', label: '页面', tasks: pageTasks },
    { key: 'comments', label: '评论及回复', tasks: commentTasks },
    { key: 'menus', label: '菜单', tasks: menuTasks },
    { key: 'moments', label: '日志', tasks: momentTasks },
    { key: 'photos', label: '图库', tasks: photoTasks },
    { key: 'links', label: '友情链接', tasks: linkTasks },
    { key: 'attachments', label: '附件', tasks: attachmentTasks }
  ].filter((g) => g.tasks.length > 0)

  return groups
}
