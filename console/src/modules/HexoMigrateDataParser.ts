import type { MigrateData, MigrateDataParser } from "@/types";

export class HexoMigrateDataParser implements MigrateDataParser {
  files: FileList;

  constructor(files: FileList) {
    this.files = files;
  }
  parse = (): Promise<MigrateData> => {
    return new Promise<MigrateData>((resolve, reject) => {
      if (this.files.length === 0) {
        reject("No file selected");
      }
      const file = this.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const xmlData = event.target?.result as string;
      };
      reader.onerror = () => {
        reject("Failed to fetch data");
      };
      reader.readAsText(file);
    });
  };
}
