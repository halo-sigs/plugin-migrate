import type { TypechoComment, TypechoUser } from '@/modules/typecho/typecho-data-parser'
import {
  createCommentOwner,
  createTypechoCommentOwnerRef,
  createTypechoUserMap,
  normalizeTypechoAttachmentPath,
  parseTypechoAttachment
} from '@/modules/typecho/use-typecho-data-parser'
import { describe, expect, it } from '@rstest/core'

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
})
