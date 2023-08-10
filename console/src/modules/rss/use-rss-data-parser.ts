import type { MigrateData, MigratePost } from "@/types";
import { XMLParser } from "fast-xml-parser";

interface useRssDataParserReturn {
  parse: () => Promise<MigrateData>;
}

export function useRssDataParser(
  source: File | string
): useRssDataParserReturn {
  const parse = (): Promise<MigrateData> => {
    const isArrayPath = ["rss.channel.item"];
    return new Promise<MigrateData>((resolve, reject) => {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "_",
        textNodeName: "value",
        isArray: (name, jpath, isLeafNode, isAttribute) => {
          if (isArrayPath.includes(jpath)) return true;
          return false;
        },
      });
      try {
        if (typeof source === "string") {
          if (!source.startsWith("http")) {
            reject("Failed to parse data. error -> invalid url");
          }
          fetch(
            "/apis/api.plugin.halo.run/v1alpha1/plugins/PluginMigrate/migrations/rss-parse",
            {
              method: "POST",
              cache: "no-cache",
              keepalive: true,
              headers: {
                "Content-Type": "application/json",
              },
              body: source,
            }
          )
            .then((response) => {
              if (!response.ok) {
                reject("解析 rss 链接失败");
                return;
              }
              return response.text();
            })
            .then((data) => {
              const result = parser.parse(data, true);
              resolve(parseData(result));
            });
        } else {
          const reader = new FileReader();
          reader.onload = (event) => {
            const xmlData = event.target?.result as string;
            const result = parser.parse(xmlData, true);
            resolve(parseData(result));
          };
          reader.onerror = () => {
            reject("Failed to fetch data");
          };
          reader.readAsText(source);
        }
      } catch (error) {
        reject("Failed to parse data. error -> " + error);
      }
    });
  };

  const parseData = (result: any): MigrateData => {
    const channel = result.rss.channel as Channel;
    return {
      posts: parsePosts(channel.item),
    };
  };

  const parsePosts = (items: Item[]) => {
    return items.map((post) => {
      return {
        postRequest: {
          post: {
            spec: {
              title: post.title,
              slug: post.title,
              deleted: false,
              publish: true,
              publishTime: new Date(post.pubDate).toISOString(),
              pinned: false,
              allowComment: true,
              visible: "PUBLIC",
              priority: 0,
              excerpt: {
                autoGenerate: false,
                raw: post.description.slice(0, 200),
              },
              htmlMetas: [],
            },
            apiVersion: "content.halo.run/v1alpha1",
            kind: "Post",
            metadata: {
              name: post.title,
            },
          },
          content: {
            raw: post["content:encoded"] || post.description,
            content: post["content:encoded"] || post.description,
            rawType: "HTML",
          },
        },
      } as MigratePost;
    });
  };

  return {
    parse,
  };
}

interface Item {
  title: string;
  link: string;
  description?: string;
  guid?: string;
  pubDate: string;
  "content:encoded"?: string;
}

interface Channel {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  language?: string;
  item: Item[];
}
