import SparkMD5 from 'spark-md5'

/**
 * 内容
 */
export interface TypechoContent {
  /**
   * 内容ID
   */
  cid: string
  /**
   * 标题
   */
  title: string
  /**
   * 缩略名
   */
  slug: string
  /**
   * 创建时间
   */
  created: string
  /**
   * 修改时间
   */
  modified: string
  /**
   * 内容
   */
  text: string
  /**
   * 排序
   */
  order: string
  /**
   * 作者ID
   */
  authorId: string
  /**
   * 模板
   */
  template: string | null
  /**
   * 类型
   */
  type: 'attachment' | 'post' | 'page'
  /**
   * 状态
   */
  status: 'publish' | 'hidden'
  /**
   * 密码
   */
  password: string | null
  /**
   * 评论数
   */
  commentsNum: string
  /**
   * 允许评论
   */
  allowComment: '0' | '1'
  /**
   * 允许Ping
   */
  allowPing: '0' | '1'
  /**
   * 允许Feed
   */
  allowFeed: '0' | '1'
  /**
   * 父内容ID
   */
  parent: string
}

/**
 * 评论
 */
export interface TypechoComment {
  /**
   * 评论ID
   */
  coid: string
  /**
   * 内容ID
   */
  cid: string
  /**
   * 创建时间
   */
  created: string
  /**
   * 评论作者
   */
  author: string
  /**
   * 评论作者ID
   */
  authorId: string
  /**
   * 内容作者ID
   */
  ownerId: string
  /**
   * 邮箱
   */
  mail: string
  /**
   * 网址
   */
  url: string | null
  /**
   * IP地址
   */
  ip: string
  /**
   * User Agent
   */
  agent: string
  /**
   * 评论内容
   */
  text: string
  /**
   * 类型
   */
  type: 'comment'
  /**
   * 状态
   */
  status: 'approved' | 'spam'
  /**
   * 父评论ID
   */
  parent: string
}

/**
 * 元数据
 */
export interface TypechoMeta {
  /**
   * 元数据ID
   */
  mid: string
  /**
   * 名称
   */
  name: string
  /**
   * 缩略名
   */
  slug: string
  /**
   * 类型
   */
  type: 'category' | 'tag'
  /**
   * 描述
   */
  description: string | null
  /**
   * 计数
   */
  count: string
  /**
   * 排序
   */
  order: string
  /**
   * 父级ID
   */
  parent: string
}

/**
 * 关系
 */
export interface TypechoRelationship {
  /**
   * 内容ID
   */
  cid: string
  /**
   * 元数据ID
   */
  mid: string
}

interface BackupData {
  contents?: TypechoContent[]
  comments?: TypechoComment[]
  metas?: TypechoMeta[]
  relationships?: TypechoRelationship[]
  users?: Record<string, any>[]
  fields?: Record<string, any>[]
}

export class TypechoDataParser {
  #buffer: ArrayBuffer
  #version = ''
  #offset = 0
  #data: BackupData = {}

  readonly #types: Record<number, keyof BackupData> = {
    1: 'contents',
    2: 'comments',
    3: 'metas',
    4: 'relationships',
    5: 'users',
    6: 'fields'
  }

  constructor(buffer: ArrayBuffer) {
    this.#buffer = buffer
  }

  public parse(): BackupData {
    this.#offset = 0
    this.#data = {}

    if (!this.#parseHeader()) {
      throw new Error('Invalid backup file: header mismatch or unsupported format.')
    }

    const fileEndOffset = this.#buffer.byteLength - 21
    while (this.#offset < fileEndOffset) {
      const dataBlock = this.#extractDataBlock()
      if (!dataBlock) {
        break
      }
      this.#processData(dataBlock.type, dataBlock.header, dataBlock.body)
    }

    if (!this.#parseFooter()) {
      console.warn('Warning: Footer mismatch or missing. The file might be corrupted.')
    }

    return this.#data
  }

  #parseHeader(): boolean {
    const HEADER_LENGTH = 21
    if (this.#buffer.byteLength < HEADER_LENGTH * 2) {
      return false
    }

    const header = new TextDecoder().decode(this.#buffer.slice(0, HEADER_LENGTH))
    const match = header.match(/^%TYPECHO_BACKUP_([A-Z0-9]{4})%/)

    if (!match) {
      return false
    }

    this.#version = match[1]
    this.#offset = HEADER_LENGTH
    return true
  }

  #parseFooter(): boolean {
    const HEADER_LENGTH = 21
    const footerOffset = this.#buffer.byteLength - HEADER_LENGTH
    if (footerOffset < 0) return false

    const footer = new TextDecoder().decode(this.#buffer.slice(footerOffset))
    const expectedHeader = `%TYPECHO_BACKUP_${this.#version}%`
    return footer === expectedHeader
  }

  #extractDataBlock(): { type: number; header: string; body: ArrayBuffer } | null {
    const startOffset = this.#offset
    const isOldVersion = this.#version === 'FILE'
    const metaLen = isOldVersion ? 6 : 8

    if (this.#offset + metaLen > this.#buffer.byteLength) {
      return null
    }

    const metaView = new DataView(this.#buffer, this.#offset, metaLen)
    this.#offset += metaLen

    let type, headerLen, bodyLen
    if (isOldVersion) {
      type = metaView.getUint16(0, true)
      headerLen = metaView.getUint16(2, true)
    } else {
      type = metaView.getUint16(0, true)
      headerLen = metaView.getUint16(2, true)
      bodyLen = metaView.getUint32(4, true)
    }

    if (this.#offset + headerLen > this.#buffer.byteLength) {
      this.#offset = startOffset
      return null
    }
    const header = new TextDecoder().decode(
      this.#buffer.slice(this.#offset, this.#offset + headerLen)
    )
    this.#offset += headerLen

    if (isOldVersion) {
      try {
        const schema = JSON.parse(header)
        bodyLen = Object.values(schema).reduce(
          (sum: number, len) => sum + (len === null ? 0 : (len as number)),
          0
        )
      } catch (e) {
        this.#offset = startOffset
        return null
      }
    }

    if (typeof bodyLen !== 'number' || this.#offset + bodyLen + 32 > this.#buffer.byteLength) {
      this.#offset = startOffset
      return null
    }

    const body = this.#buffer.slice(this.#offset, this.#offset + bodyLen)
    this.#offset += bodyLen

    const md5FromServer = new TextDecoder().decode(
      this.#buffer.slice(this.#offset, this.#offset + 32)
    )
    this.#offset += 32

    const metaSlice = this.#buffer.slice(startOffset, startOffset + metaLen)
    const headerSlice = new TextEncoder().encode(header)

    const concatenated = new Uint8Array(
      metaSlice.byteLength + headerSlice.byteLength + body.byteLength
    )
    concatenated.set(new Uint8Array(metaSlice), 0)
    concatenated.set(headerSlice, metaSlice.byteLength)
    concatenated.set(new Uint8Array(body), metaSlice.byteLength + headerSlice.byteLength)

    const md5Calculated = SparkMD5.ArrayBuffer.hash(concatenated.buffer)

    if (md5FromServer !== md5Calculated) {
      this.#offset = startOffset
      return null
    }

    return { type, header, body }
  }

  #processData(type: number, header: string, body: ArrayBuffer) {
    const tableName = this.#types[type]
    if (!tableName) {
      return
    }

    try {
      const schema = JSON.parse(header)
      const row: Record<string, any> = {}
      let offset = 0
      const bodyDecoder = new TextDecoder()

      for (const [key, len] of Object.entries(schema)) {
        if (len === null) {
          row[key] = null
        } else {
          const length = len as number
          let value = bodyDecoder.decode(body.slice(offset, offset + length))
          value = value.replace(/&#8195;/g, ' ').replace(/&emsp;/g, ' ')
          row[key] = value
          offset += length
        }
      }

      if (!this.#data[tableName]) {
        this.#data[tableName] = []
      }

      this.#data[tableName]?.push(row as any)
    } catch (e) {
      console.warn('Skipping a data block due to invalid header JSON.')
    }
  }
}

/**
 * 表示可以从 PHP 序列化字符串反序列化的值。
 * 它可以是基本类型（字符串、数字、null），也可以是嵌套对象，
 * 其中键是字符串或数字，值是 PhpValue 本身。
 */
export type PhpValue = string | number | null | { [key: string | number]: PhpValue }

/**
 * 反序列化一个 PHP 字符串，正确处理多字节字符。
 *
 * @param serializedString - PHP 序列化字符串.
 * @returns The deserialized data, typed as PhpValue.
 */
export function phpUnserialize(serializedString: string): PhpValue {
  let offset = 0
  const buffer = new TextEncoder().encode(serializedString)
  const decoder = new TextDecoder('utf-8')

  function readUntil(char: string): string {
    const start = offset
    while (offset < buffer.length && String.fromCharCode(buffer[offset]) !== char) {
      offset++
    }
    return decoder.decode(buffer.slice(start, offset))
  }

  function parse(): PhpValue {
    if (offset >= buffer.length) {
      throw new Error('Unexpected end of serialized string.')
    }

    const type = String.fromCharCode(buffer[offset]).toLowerCase()
    offset++ // type

    if (type === 'n') {
      offset++ // ;
      return null
    }

    if (String.fromCharCode(buffer[offset]) !== ':') {
      throw new Error(
        `Invalid serialized format: expected ':' after type '${type}' at offset ${offset}.`
      )
    }
    offset++ // :

    switch (type) {
      case 'i': {
        const valueStr = readUntil(';')
        offset++ // ;
        return parseInt(valueStr, 10)
      }
      case 's': {
        const lengthStr = readUntil(':')
        const length = parseInt(lengthStr, 10)
        offset++ // :

        if (String.fromCharCode(buffer[offset]) !== '"') {
          throw new Error(`Expected '"' at start of string value at offset ${offset}.`)
        }
        offset++ // "

        const value = buffer.slice(offset, offset + length)
        offset += length

        if (String.fromCharCode(buffer[offset]) !== '"') {
          throw new Error(`Expected '"' at end of string value at offset ${offset}.`)
        }
        offset++ // "

        if (String.fromCharCode(buffer[offset]) !== ';') {
          throw new Error(`Expected ';' after string value at offset ${offset}.`)
        }
        offset++ // ;

        return decoder.decode(value)
      }
      case 'a': {
        const countStr = readUntil(':')
        const count = parseInt(countStr, 10)
        offset++ // :

        if (String.fromCharCode(buffer[offset]) !== '{') {
          throw new Error(`Expected '{' at start of array/object at offset ${offset}.`)
        }
        offset++ // {

        const result: { [key: string | number]: PhpValue } = {}
        for (let i = 0; i < count; i++) {
          const key = parse()
          const value = parse()
          if (typeof key === 'string' || typeof key === 'number') {
            result[key] = value
          } else {
            console.warn(`Invalid key type "${typeof key}" found. Skipping.`)
          }
        }

        if (String.fromCharCode(buffer[offset]) !== '}') {
          throw new Error(`Expected '}' at end of array/object at offset ${offset}.`)
        }
        offset++ // }
        return result
      }
      default:
        throw new Error(`Unsupported type: ${type} at offset ${offset - 2}`)
    }
  }

  return parse()
}
