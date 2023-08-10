---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "迁移插件使用文档"
  tagline: "Halo 官方迁移插件，支持从 Halo 1.x, WordPress, Rss 等多种导入数据至 Halo 中。"
  actions:
    - theme: brand
      text: 快速开始
      link: /provider/halo
    - theme: alt
      text: 在 Github 上查看
      link: https://github.com/halo-sigs/plugin-migrate
---

<script setup>
import { VPTeamMembers } from 'vitepress/theme'

const members = [
  {
    avatar: 'https://www.github.com/ruibaby.png',
    name: 'Ryan Wang',
    title: 'Creator',
    org: 'Halo-dev',
    orgLink: 'https://github.com/halo-dev',
    links: [
      { icon: 'github', link: 'https://github.com/ruibaby' },
    ]
  },
  {
    avatar: 'https://www.github.com/lilgg.png',
    name: 'Takagi',
    title: 'Developer',
    org: 'Halo-dev',
    orgLink: 'https://github.com/halo-dev',
    links: [
      { icon: 'github', link: 'https://github.com/lilgg' },
    ]
  },
  {
    avatar: 'https://www.github.com/guqing.png',
    name: 'guqing',
    title: 'Developer',
    org: 'Halo-dev',
    orgLink: 'https://github.com/halo-dev',
    links: [
      { icon: 'github', link: 'https://github.com/guqing' },
    ]
  },
]
</script>

<VPTeamMembers size="small" :members="members" />

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #bd34fe, #41d1ff);
}
</style>
