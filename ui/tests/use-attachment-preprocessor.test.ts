import {
  findMatchingFile,
  normalizePath,
  normalizeUrl
} from '@/composables/use-attachment-preprocessor'
import { describe, expect, it } from '@rstest/core'

function createFile(name: string, relativePath?: string) {
  const file = new File(['content'], name, { type: 'image/png' })

  if (relativePath) {
    Object.defineProperty(file, 'webkitRelativePath', {
      configurable: true,
      value: relativePath
    })
  }

  return file
}

function createFileList(files: File[]): FileList {
  const fileList = {
    length: files.length,
    item(index: number) {
      return files[index] ?? null
    },
    ...files
  }

  return fileList as FileList
}

describe('attachment preprocessor helpers', () => {
  it('normalizes urls and decodes relative paths', () => {
    expect(
      normalizeUrl('http://example.com/usr/uploads/2026/04/%E4%B8%AD%E6%96%87.png?x=1#hash')
    ).toBe('usr/uploads/2026/04/中文.png')
    expect(normalizePath('.\\usr\\uploads\\2026\\04\\demo.png')).toBe(
      'usr/uploads/2026/04/demo.png'
    )
  })

  it('matches files when the selected folder keeps the root directory name', () => {
    const file = createFile('demo.png', 'site-root/usr/uploads/2026/04/demo.png')

    expect(findMatchingFile('usr/uploads/2026/04/demo.png', createFileList([file]))).toBe(file)
  })

  it('matches wordpress size variants by basename fallback', () => {
    const file = createFile('image.jpg', 'uploads/2026/04/image.jpg')

    expect(findMatchingFile('uploads/2026/04/image-1024x576.jpg', createFileList([file]))).toBe(
      file
    )
  })
})
