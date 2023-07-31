import type {
  MigrateCategory,
  MigrateComment,
  MigrateData,
  MigrateReply,
} from "@/types";
import { XMLParser } from "fast-xml-parser";

interface useRssDataParserReturn {
  parse: () => Promise<MigrateData>;
}

export function useRssDataParser(file: File): useRssDataParserReturn {
  const menuChildrenMap = new Map<string, string[]>();

  const parse = (): Promise<MigrateData> => {
    return new Promise<MigrateData>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const xmlData = event.target?.result as string;
        const isArrayPath = [
          "rss.channel.item.category",
          "rss.channel.item.wp:postmeta",
          "rss.channel.item.wp:comment",
        ];
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
          const result = parser.parse(xmlData, true);

          resolve({} as MigrateData);
        } catch (error) {
          reject("Failed to parse data. error -> " + error);
        }
      };
      reader.onerror = () => {
        reject("Failed to fetch data");
      };
      reader.readAsText(file);
    });
  };

  return {
    parse,
  };
}
