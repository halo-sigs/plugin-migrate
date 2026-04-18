import type {
  TypechoComment,
  TypechoContent,
  TypechoUser
} from '@/modules/typecho/typecho-data-parser'
import {
  createCommentOwner,
  createTypechoCommentOwnerRef,
  createTypechoUserMap,
  normalizeTypechoAttachmentPath,
  parseTypechoAttachment,
  parseTypechoAttachments,
  parseTypechoComments,
  useTypechoDataParser
} from '@/modules/typecho/use-typecho-data-parser'
import { describe, expect, it } from '@rstest/core'
import { createTypechoBackupFile } from './fixtures/provider-fixtures'

function createUser(overrides: Partial<TypechoUser> = {}): TypechoUser {
  return {
    uid: '7',
    name: 'ryan',
    password: null,
    mail: 'ryan@example.com',
    url: 'https://example.com',
    screenName: 'Ryan',
    created: '0',
    activated: null,
    logged: null,
    group: 'subscriber',
    authCode: null,
    ...overrides
  }
}

function createComment(overrides: Partial<TypechoComment> = {}): TypechoComment {
  return {
    coid: '1',
    cid: '9',
    created: '1710000000',
    author: 'Guest',
    authorId: '0',
    ownerId: '7',
    mail: 'guest@example.com',
    url: 'https://guest.example.com',
    ip: '127.0.0.1',
    agent: 'Mozilla/5.0',
    text: 'hello',
    type: 'comment',
    status: 'approved',
    parent: '0',
    ...overrides
  }
}

function createContent(overrides: Partial<TypechoContent> = {}): TypechoContent {
  return {
    cid: '9',
    title: 'Demo Post',
    slug: 'demo-post',
    created: '1710000000',
    modified: '1710000000',
    text: 'content',
    order: '0',
    authorId: '7',
    template: null,
    type: 'post',
    status: 'publish',
    password: null,
    commentsNum: '0',
    allowComment: '1',
    allowPing: '1',
    allowFeed: '1',
    parent: '0',
    ...overrides
  }
}

describe('typecho parser helpers', () => {
  it('parses attachment metadata from json and php serialized payloads', () => {
    expect(
      parseTypechoAttachment(
        '{"name":"demo.png","path":"/usr/uploads/2026/04/demo.png","size":"12","type":"image","mime":"image/png"}'
      )
    ).toEqual({
      name: 'demo.png',
      path: '/usr/uploads/2026/04/demo.png',
      size: 12,
      type: 'image',
      mime: 'image/png'
    })

    expect(
      parseTypechoAttachment(
        'a:5:{s:4:"name";s:8:"demo.png";s:4:"path";s:29:"/usr/uploads/2026/04/demo.png";s:4:"size";s:2:"12";s:4:"type";s:5:"image";s:4:"mime";s:9:"image/png";}'
      )
    ).toEqual({
      name: 'demo.png',
      path: '/usr/uploads/2026/04/demo.png',
      size: 12,
      type: 'image',
      mime: 'image/png'
    })
  })

  it('normalizes local attachment paths for the shared handler', () => {
    expect(normalizeTypechoAttachmentPath(' /usr/uploads/2026/04/demo.png ')).toBe(
      'usr/uploads/2026/04/demo.png'
    )
  })

  it('only creates owner refs for real comment authors', () => {
    const userMap = createTypechoUserMap([createUser()])

    expect(createTypechoCommentOwnerRef(createComment(), userMap)).toBeUndefined()
    expect(
      createTypechoCommentOwnerRef(createComment({ authorId: '7', ownerId: '99' }), userMap)
    ).toEqual({
      sourceId: 'typecho:7'
    })
  })

  it('builds comment owners from matched source users when author fields are missing', () => {
    const userMap = createTypechoUserMap([createUser()])

    expect(
      createCommentOwner(
        createComment({
          author: '',
          authorId: '7',
          mail: '',
          url: null
        }),
        userMap
      )
    ).toEqual({
      kind: 'Email',
      name: 'ryan@example.com',
      displayName: 'Ryan',
      annotations: {
        website: 'https://example.com'
      }
    })
  })

  it('builds comment and reply records with the root comment reference', () => {
    const user = createUser()
    const records = parseTypechoComments(
      [createContent()],
      [
        createComment({ coid: '100', cid: '9', authorId: '7', author: 'Ryan' }),
        createComment({
          coid: '101',
          cid: '9',
          parent: '100',
          authorId: '7',
          author: 'Ryan reply'
        }),
        createComment({
          coid: '102',
          cid: '9',
          parent: '101',
          authorId: '7',
          author: 'Nested reply'
        })
      ],
      [user]
    )

    expect(records).toHaveLength(3)
    expect(records[0]).toMatchObject({
      kind: 'Comment',
      metadata: { name: 'comment-100' },
      refType: 'Post',
      ownerRef: { sourceId: 'typecho:7' },
      spec: {
        subjectRef: {
          kind: 'Post',
          name: 'post-9'
        }
      }
    })
    expect(records[1]).toMatchObject({
      kind: 'Reply',
      metadata: { name: 'comment-101' },
      spec: {
        commentName: 'comment-100',
        quoteReply: 'comment-100'
      }
    })
    expect(records[2]).toMatchObject({
      kind: 'Reply',
      metadata: { name: 'comment-102' },
      spec: {
        commentName: 'comment-100',
        quoteReply: 'comment-101'
      }
    })
  })

  it('skips comments whose content cannot be found and keeps parsing later comments', () => {
    const records = parseTypechoComments(
      [createContent({ cid: '9' }), createContent({ cid: '10', type: 'page' })],
      [
        createComment({ coid: '1', cid: 'missing' }),
        createComment({ coid: '2', cid: '10', authorId: '7' })
      ],
      [createUser()]
    )

    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      kind: 'Comment',
      refType: 'SinglePage',
      metadata: { name: 'comment-2' }
    })
  })

  it('builds local attachment records from attachment contents', () => {
    const attachments = parseTypechoAttachments([
      createContent({
        cid: '20',
        type: 'attachment',
        title: 'Original Title',
        text: '{"name":"demo.png","path":"/usr/uploads/2026/04/demo.png","size":"12","type":"image","mime":"image/png"}'
      })
    ])

    expect(attachments).toEqual([
      {
        id: 'attachment-20',
        name: 'demo.png',
        path: 'usr/uploads/2026/04/demo.png',
        type: 'LOCAL',
        height: 0,
        width: 0,
        mediaType: 'image/png',
        size: 12
      }
    ])
  })
})

describe('useTypechoDataParser', () => {
  it('parses users posts pages comments tags categories and attachments from a minimal backup file', async () => {
    const data = await useTypechoDataParser(createTypechoBackupFile()).parse()

    expect(data.users).toEqual([
      expect.objectContaining({
        id: 'typecho:7',
        provider: 'typecho',
        displayName: 'Typecho Admin',
        email: 'admin@example.com'
      })
    ])
    expect(data.posts?.[0]).toMatchObject({
      ownerRef: { sourceId: 'typecho:7' },
      postRequest: {
        post: {
          metadata: { name: 'post-1' },
          spec: {
            title: 'Typecho Post',
            publish: true,
            allowComment: true,
            visible: 'PUBLIC',
            categories: ['category-20'],
            tags: ['tag-21']
          }
        }
      }
    })
    expect(data.posts?.[0].postRequest.content.rawType).toBe('markdown')
    expect(data.posts?.[0].postRequest.content.content).toContain(
      '<img src="usr/uploads/2026/04/demo.png"'
    )
    expect(data.pages?.[0]).toMatchObject({
      ownerRef: { sourceId: 'typecho:7' },
      singlePageRequest: {
        page: {
          metadata: { name: 'page-2' },
          spec: {
            title: 'Typecho Page',
            publish: false,
            allowComment: false
          }
        }
      }
    })
    expect(data.comments?.map((item) => item.kind)).toEqual(['Comment', 'Reply'])
    expect(data.comments?.[0]).toMatchObject({
      metadata: { name: 'comment-10' },
      ownerRef: { sourceId: 'typecho:7' }
    })
    expect(data.comments?.[1]).toMatchObject({
      kind: 'Reply',
      spec: {
        commentName: 'comment-10',
        quoteReply: 'comment-10'
      }
    })
    expect(data.tags?.[0]).toMatchObject({
      metadata: { name: 'tag-21' },
      spec: { displayName: 'Tips', slug: 'tips' }
    })
    expect(data.categories?.[0]).toMatchObject({
      metadata: { name: 'category-20' },
      spec: { displayName: 'Tech', slug: 'tech' }
    })
    expect(data.attachments?.[0]).toMatchObject({
      id: 'attachment-3',
      path: 'usr/uploads/2026/04/demo.png',
      type: 'LOCAL'
    })
  })
})
