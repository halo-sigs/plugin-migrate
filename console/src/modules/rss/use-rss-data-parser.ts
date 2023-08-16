import type { MigrateData, MigratePost } from "@/types";
import { XMLParser } from "fast-xml-parser";
import { randomUUID } from "@/utils/id";
import { slugify } from "transliteration";

interface useRssDataParserReturn {
  parse: () => Promise<MigrateData>;
}

const isArrayPath = ["rss.channel.item"];
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "_",
  textNodeName: "value",
  isArray: (name, jpath, isLeafNode, isAttribute) => {
    if (isArrayPath.includes(jpath)) return true;
    return false;
  },
});

export function useRssDataParser(
  source: File | string
): useRssDataParserReturn {
  const parse = (): Promise<MigrateData> => {
    return new Promise<MigrateData>((resolve, reject) => {
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
              parseData(data)
                .then((data) => {
                  resolve(data);
                })
                .catch((error) => {
                  reject(error);
                });
            });
        } else {
          const reader = new FileReader();
          reader.onload = (event) => {
            const xmlData = event.target?.result as string;
            parseData(xmlData)
              .then((data) => {
                resolve(data);
              })
              .catch((error) => {
                reject(error);
              });
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

  const parseData = (data: any): Promise<MigrateData> => {
    return new Promise<MigrateData>((resolve, reject) => {
      try {
        const result = parser.parse(data, true);
        const channel = result.rss.channel as Channel;
        if (!channel) {
          reject("目标文件不是标准的 RSS 文件");
        }
        resolve({
          posts: parsePosts(channel.item),
        });
      } catch (error) {
        console.error(error);
        reject("RSS 文件解析失败");
      }
    });
  };

  const parsePosts = (items: Item[]) => {
    return items?.map((post) => {
      return {
        postRequest: {
          post: {
            spec: {
              title: post.title,
              slug: slugify(post.title, {
                trim: true,
              }),
              deleted: false,
              publish: true,
              publishTime: new Date(post.pubDate).toISOString(),
              pinned: false,
              allowComment: true,
              visible: "PUBLIC",
              priority: 0,
              excerpt: {
                autoGenerate: false,
                raw: post.description?.slice(0, 200) || "",
              },
              htmlMetas: [],
            },
            apiVersion: "content.halo.run/v1alpha1",
            kind: "Post",
            metadata: {
              name: randomUUID(),
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
