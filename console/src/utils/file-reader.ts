export function useFileRender(file: File) {
  const reader = new FileReader();
  reader.onload = function (event) {
    if (event.target && event.target.result) {
      debugger;
      const jsonContent = event.target.result.toString();
      const jsonData = JSON.parse(jsonContent);
      return jsonData;
      console.log("读取到的 JSON 数据:", jsonData);
    }
  };
  reader.readAsText(file);
}
