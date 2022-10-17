<script lang="ts" setup>
import { VButton } from "@halo-dev/components";
import { useFileSystemAccess } from "@vueuse/core";
import { apiClient } from "@/utils/api-client";

async function handleOpenFile() {
  const res = useFileSystemAccess({
    dataType: "Text",
    types: [
      {
        description: "json",
        accept: {
          "text/yaml": [".json"],
        },
      },
    ],
    excludeAcceptAllOption: true,
  });

  if (!res.isSupported) {
    alert("当前浏览器不支持选择文件");
    return;
  }

  await res.open();

  try {
    if (!res.data.value) {
      return;
    }

    const data = JSON.parse(res.data.value);

    const { tags, posts, contents, post_tags, categories, post_categories } =
      data;

    console.log(tags);

    const tagCreateRequests = tags.map((item) => {
      return apiClient.extension.tag.createcontentHaloRunV1alpha1Tag({
        tag: {
          metadata: {
            name: item.id + "",
          },
          kind: "Tag",
          apiVersion: "content.halo.run/v1alpha1",
          spec: {
            displayName: item.name,
            slug: item.slug,
            color: item.color,
            cover: item.thumbnail,
          },
        },
      });
    });

    try {
      await Promise.all(tagCreateRequests);
    } catch (error) {
      console.log("Failed to create tags", error);
    }

    const categoryCreateRequests = categories.map((item) => {
      return apiClient.extension.category.createcontentHaloRunV1alpha1Category({
        category: {
          metadata: {
            name: item.id + "",
          },
          kind: "Category",
          apiVersion: "content.halo.run/v1alpha1",
          spec: {
            displayName: item.name,
            slug: item.slug,
            description: item.description,
            cover: item.thumbnail,
            priority: item.priority,
            children: [],
          },
        },
      });
    });

    try {
      await Promise.all(categoryCreateRequests);
    } catch (error) {
      console.log("Failed to create categories", error);
    }

    const postCreateRequests = posts.map((item) => {
      const content = contents.find((content) => content.id === item.id);
      const tagIds = post_tags
        .filter((postTag) => postTag.postId === item.id)
        .map((postTag) => postTag.tagId);

      const categoryIds = post_categories
        .filter((postCategory) => postCategory.postId === item.id)
        .map((postCategory) => postCategory.categoryId);

      return apiClient.post.draftPost({
        postRequest: {
          post: {
            spec: {
              title: item.title,
              slug: item.slug,
              template: "",
              cover: item.thumbnail,
              deleted: item.status === "RECYCLE",
              published: false,
              publishTime: "",
              pinned: item.topPriority > 0,
              allowComment: !item.disallowComment,
              visible: "PUBLIC",
              version: 1,
              priority: 0,
              excerpt: {
                autoGenerate: false,
                raw: item.summary,
              },
              categories: categoryIds,
              tags: tagIds,
              htmlMetas: [],
            },
            apiVersion: "content.halo.run/v1alpha1",
            kind: "Post",
            metadata: {
              name: item.id + "",
            },
          },
          content: {
            raw: content.content,
            content: content.content,
            rawType: "HTML",
          },
        },
      });
    });

    await Promise.all(postCreateRequests);

    const postPublishRequests = posts
      .map((item) => {
        if (item.status !== "DRAFT" && item.status !== "RECYCLE") {
          return apiClient.post.publishPost({
            name: item.id + "",
          });
        }
      })
      .filter(Boolean);

    await Promise.all(postPublishRequests);
  } catch (e) {
    console.error(e);
  }
}
</script>
<template>
  <VButton @click="handleOpenFile">选择文件</VButton>
</template>
