<script lang="ts" setup>
import { VButton } from "@halo-dev/components";
import { useFileSystemAccess } from "@vueuse/core";
import { apiClient } from "@/utils/api-client";
import type {
  Post,
  Tag,
  Category,
  Content,
  PostTag,
  PostCategory,
  Comment,
  Sheet,
} from "../types/models";
import type { AxiosResponse } from "axios";
import { arrayToTree } from "performant-array-to-tree";

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

  if (!res.data.value) {
    return;
  }

  const data = JSON.parse(res.data.value);

  const {
    tags,
    posts,
    contents,
    post_tags,
    categories,
    post_categories,
    post_comments,
    sheets,
    sheet_comments,
  } = data;

  const tagCreateRequests = tags.map((item: Tag) => {
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

  const categoryCreateRequests = categories.map((item: Category) => {
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

  const postCreateRequests = posts.map((item: Post) => {
    const content = contents.find((content: Content) => content.id === item.id);
    const tagIds = post_tags
      .filter((postTag: PostTag) => postTag.postId === item.id)
      .map((postTag: PostTag) => postTag.tagId);

    const categoryIds = post_categories
      .filter((postCategory: PostCategory) => postCategory.postId === item.id)
      .map((postCategory: PostCategory) => postCategory.categoryId);

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
    .map((item: Post) => {
      if (item.status !== "DRAFT" && item.status !== "RECYCLE") {
        return apiClient.post.publishPost({
          name: item.id + "",
        });
      }
    })
    .filter(Boolean);

  await Promise.all(postPublishRequests);

  const singlePageCreateRequests = sheets.map((item: Sheet) => {
    const content = contents.find((content: Content) => content.id === item.id);

    return apiClient.singlePage.draftSinglePage({
      singlePageRequest: {
        page: {
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
            htmlMetas: [],
          },
          apiVersion: "content.halo.run/v1alpha1",
          kind: "SinglePage",
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

  await Promise.all(singlePageCreateRequests);

  const singlePagePublishRequests = sheets
    .map((item: Sheet) => {
      if (item.status !== "DRAFT" && item.status !== "RECYCLE") {
        return apiClient.singlePage.publishSinglePage({
          name: item.id + "",
        });
      }
    })
    .filter(Boolean);

  await Promise.all(singlePagePublishRequests);

  const {
    commentCreateRequests: postCommentCreateRequests,
    replyCreateRequests: postReplyCreateRequests,
  } = createCommentRequests(
    arrayToTree(post_comments, {
      dataField: null,
      rootParentIds: {
        0: true,
      },
    }) as Comment[],
    {
      kind: "Post",
      group: "content.halo.run",
      version: "v1alpha1",
    }
  );

  await Promise.all(postCommentCreateRequests);
  await Promise.all(postReplyCreateRequests);

  const {
    commentCreateRequests: singlePageCommentCreateRequests,
    replyCreateRequests: singlePageReplyCreateRequests,
  } = createCommentRequests(
    arrayToTree(sheet_comments, {
      dataField: null,
      rootParentIds: {
        0: true,
      },
    }) as Comment[],
    {
      kind: "SinglePage",
      group: "content.halo.run",
      version: "v1alpha1",
    }
  );

  await Promise.all(singlePageCommentCreateRequests);
  await Promise.all(singlePageReplyCreateRequests);
}

function createCommentRequests(
  commentsTree: Comment[],
  subjectRef: { kind: string; group: string; version: string }
) {
  const commentCreateRequests: Promise<AxiosResponse>[] = [];
  const replyCreateRequests: Promise<AxiosResponse>[] = [];

  createCommentOrReply(commentsTree, undefined);

  function createCommentOrReply(comments: Comment[], commentName?: number) {
    comments.forEach((comment: Comment) => {
      if (comment.parentId === 0) {
        commentName = comment.id;
        commentCreateRequests.push(
          apiClient.extension.comment.createcontentHaloRunV1alpha1Comment({
            comment: {
              kind: "Comment",
              apiVersion: "content.halo.run/v1alpha1",
              spec: {
                raw: comment.content,
                content: comment.content,
                owner: {
                  kind: "Email",
                  name: comment.email,
                  displayName: comment.author,
                  annotations: {
                    avatar: `https://www.gravatar.com/avatar/${comment.gravatarMd5}?s=64&d=identicon&r=PG`,
                    website: comment.authorUrl,
                  },
                },
                userAgent: comment.userAgent,
                ipAddress: comment.ipAddress,
                priority: 0,
                top: false,
                allowNotification: comment.allowNotification,
                approved: true,
                hidden: false,
                subjectRef: {
                  ...subjectRef,
                  name: comment.postId + "",
                },
                lastReadTime: undefined,
              },
              metadata: {
                name: comment.id + "",
              },
            },
          })
        );
      } else {
        replyCreateRequests.push(
          apiClient.extension.reply.createcontentHaloRunV1alpha1Reply({
            reply: {
              kind: "Reply",
              apiVersion: "content.halo.run/v1alpha1",
              metadata: {
                name: comment.id + "",
              },
              spec: {
                raw: comment.content,
                content: comment.content,
                owner: {
                  kind: "Email",
                  name: comment.email,
                  displayName: comment.author,
                  annotations: {
                    avatar: `https://www.gravatar.com/avatar/${comment.gravatarMd5}?s=64&d=identicon&r=PG`,
                    website: comment.authorUrl,
                  },
                },
                userAgent: comment.userAgent,
                ipAddress: comment.ipAddress,
                priority: 0,
                top: false,
                allowNotification: comment.allowNotification,
                approved: true,
                hidden: false,
                commentName: commentName + "",
                quoteReply: comment.parentId + "",
              },
            },
          })
        );
      }

      if (comment.children?.length) {
        createCommentOrReply(comment.children, commentName);
      }
    });
  }
  return { commentCreateRequests, replyCreateRequests };
}
</script>
<template>
  <VButton @click="handleOpenFile">选择文件</VButton>
</template>
