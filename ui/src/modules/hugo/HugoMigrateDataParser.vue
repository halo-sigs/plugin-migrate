<script setup lang="ts">
import FileSelector from '@/components/FileSelector.vue'
import { HugoDataParser } from '@/modules/hugo/hugo-data-parser'
import type { MigrateData } from '@/types'
import { VAlert, VButton, VCard, VLoading, VTag } from '@halo-dev/components'
import { computed, reactive, type Ref, ref } from 'vue'

const emit = defineEmits<{
  (event: 'update:data', value: MigrateData): void
}>()

/**
 * `Init` -> `Parsing` -> `Configure` -> `Parsing` -> `Parsed`
 */
enum State {
  Init,
  Parsing,
  Configure,
  Parsed
}

interface HaloEntry {
  name: string
  slug: string
}

type Tag = {
  name: string
  slug: string
}

type Category = {
  name: string
  slug: string
}

type SectionType = 'page' | 'post' | 'ignore'

const state: Ref<State> = ref(State.Init)
const errorMessage: Ref<string | null> = ref(null)
let selectedFile: File | undefined

const sections = reactive<Record<string, SectionType>>({})

const migrateData: Ref<MigrateData | null> = ref(null)
const posts: Ref<HaloEntry[]> = computed(
  () =>
    migrateData.value?.posts?.map((post): HaloEntry => {
      return {
        name: post.postRequest.post.spec.title,
        slug: post.postRequest.post.spec.slug
      }
    }) ?? []
)
const pages: Ref<HaloEntry[]> = computed(
  () =>
    migrateData.value?.pages?.map((page): HaloEntry => {
      return {
        name: page.singlePageRequest.page.spec.title,
        slug: page.singlePageRequest.page.spec.slug
      }
    }) ?? []
)
const categories: Ref<Category[]> = computed(
  () =>
    migrateData.value?.categories?.map((migrateCategory): Category => {
      return {
        name: migrateCategory.spec.displayName,
        slug: migrateCategory.spec.slug
      }
    }) ?? []
)
const tags: Ref<Tag[]> = computed(
  () =>
    migrateData.value?.tags?.map((migrateTag): Tag => {
      return {
        name: migrateTag.spec.displayName,
        slug: migrateTag.spec.slug
      }
    }) ?? []
)

async function handleFileChange(files: FileList) {
  if (files.length == 0) {
    selectedFile = undefined
    return
  }
  const file = files.item(0)
  if (!file) {
    selectedFile = undefined
    return
  }
  selectedFile = file
  state.value = State.Parsing
  try {
    await parseSections(file)
    state.value = State.Configure
  } catch (e) {
    console.error(e)
    setErrorState(e)
  }
}

async function onConfirmConfiguration() {
  if (!selectedFile) {
    resetToInitState()
    return
  }
  state.value = State.Parsing

  // assemble section mapping
  const postSections: string[] = []
  const pageSections: string[] = []

  for (const key in sections) {
    if (sections[key] == 'post') {
      postSections.push(key)
    } else if (sections[key] == 'page') {
      pageSections.push(key)
    }
  }

  try {
    const data: MigrateData = await new HugoDataParser(postSections, pageSections).parse(
      selectedFile
    )
    migrateData.value = data

    emit('update:data', data)
    state.value = State.Parsed
  } catch (e) {
    console.error(e)
    setErrorState(e)
  }
}

/**
 * Extract all sections from the uploaded file and save them into {@link sections} with guessed type.
 * @param file
 */
async function parseSections(file: File) {
  for (const key in sections) {
    delete sections[key]
  }
  const sectionsNames = await new HugoDataParser([]).parseSections(file)

  const inferSectionType = (s: string): SectionType => {
    if (s == 'post' || s == 'blog') {
      return 'post'
    } else if (s == 'page') {
      return 'page'
    }
    return 'ignore'
  }

  for (const s of sectionsNames) {
    sections[s] = inferSectionType(s)
  }
}

function resetToInitState() {
  selectedFile = undefined
  errorMessage.value = null
  state.value = State.Init
  emit('update:data', {})
}

function setErrorState(e: unknown) {
  state.value = State.Init
  if (e instanceof Error) {
    errorMessage.value = e.message
  } else {
    errorMessage.value = `${e}`
  }
}
</script>

<template>
  <div class=":uno: sm:w-2/3">
    <VAlert title="提示" type="info" :closable="false" class=":uno: sheet">
      <template #description>
        HUGO 是十分灵活强大的框架，本插件目前仅支持普通的文章与页面，并且：
        <ul>
          <li>- 不支持本地附件文件（包括图片）迁移。</li>
          <li>- 不支持模板文件 <code>_index.md</code>。</li>
          <li>- 仅支持下列 matter: title, slug, draft, categories, tags, date。</li>
          <li>- 仅处理内容，不解析 HUGO 配置文件。</li>
        </ul>
      </template>
    </VAlert>
    <VAlert
      v-if="errorMessage"
      class=":uno: sheet"
      title="错误"
      type="error"
      description="dddd"
      @on-close="errorMessage = null"
    />

    <div v-show="state == State.Parsing">
      正在解析文件...
      <VLoading />
    </div>

    <!-- upload  -->
    <div v-if="state == State.Init">
      <span class=":uno: my-6 block"> 请上传 HUGO <code>content</code> 目录的 zip 压缩包： </span>
      <FileSelector :options="{ accept: '.zip', multiple: false }" @fileChange="handleFileChange" />
    </div>

    <!--  section mapping configuration -->
    <VCard v-if="state == State.Configure" title="请选择内容映射" class=":uno: sheet">
      <p>
        此处列出了解析出的 HUGO
        <a href="https://gohugo.io/content-management/sections/" target="_blank"> Section </a>
        ，请分别选择要转换成的 Halo 内容类型。
      </p>
      <FormKit
        v-for="(sectionType, section) in sections"
        :key="section"
        type="nativeSelect"
        :label="section"
        :value="sectionType"
        :options="{
          post: '文章',
          page: '单页',
          ignore: '忽略'
        }"
        @input="(t: SectionType) => (sections[section] = t)"
      />

      <VButton type="primary" @click="onConfirmConfiguration">确认</VButton>
      <VButton class=":uno: mx-2" @click="resetToInitState">重新选择文件</VButton>
    </VCard>

    <!-- parsed data -->
    <div v-if="state == State.Parsed">
      <VButton @click="resetToInitState">重新选择文件</VButton>
      <h3 class=":uno: my-2">已解析数据，确认无误后请点击页面底部的「下一步」按钮。</h3>
      <VCard v-show="pages.length > 0" :title="`独立页面 (${pages.length})`" class=":uno: sheet">
        <ul>
          <li v-for="(item, index) in pages" :key="index" v-tooltip="`slug: ${item.slug}`">
            - {{ item.name }}
          </li>
        </ul>
      </VCard>
      <VCard v-show="posts.length > 0" :title="`文章 (${posts.length})`" class=":uno: sheet">
        <ul>
          <li v-for="(item, index) in posts" :key="index">
            - {{ item.name }}:
            <code class=":uno: text-gray-500">{{ item.slug }}</code>
          </li>
        </ul>
      </VCard>
      <VCard
        v-show="categories.length > 0"
        :title="`分类 (${categories.length})`"
        class=":uno: sheet"
      >
        <VTag
          v-for="(category, index) in categories"
          :key="index"
          class=":uno: mx-1"
          v-tooltip="`slug: ${category.slug}`"
        >
          {{ category.name }}
        </VTag>
      </VCard>
      <VCard v-show="tags.length > 0" :title="`标签 (${tags.length})`" class=":uno: sheet">
        <VTag
          v-for="(tag, index) in tags"
          :key="index"
          class=":uno: mx-1"
          v-tooltip="`slug: ${tag.slug}`"
        >
          {{ tag.name }}
        </VTag>
      </VCard>
    </div>
  </div>
</template>

<style scoped>
.sheet {
  margin-bottom: 16px;
}

a {
  text-decoration: underline;
}
</style>
