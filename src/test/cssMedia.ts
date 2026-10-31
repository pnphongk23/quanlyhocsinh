import { readFileSync } from "node:fs";

/**
 * jsdom không áp media query của CSS module, nên các test giao diện kiểm hợp đồng
 * ở nguồn: rule nào nằm trong khung màn hình nào, và rule nào áp cho mọi khổ.
 */
export const readCss = (path: string): string =>
  readFileSync(`${process.cwd()}/${path}`, "utf8");

/** Vị trí dấu `}` đóng khối mở ở `open`, tính cả khối lồng nhau. */
function blockEnd(css: string, open: number): number {
  let depth = 0;
  for (let index = open; index < css.length; index++) {
    if (css[index] === "{") depth++;
    else if (css[index] === "}" && --depth === 0) return index;
  }
  throw new Error("Khối CSS chưa đóng.");
}

/** Các khối `@media <query>` nguyên văn trong CSS. */
export function mediaBlocks(css: string, query: string): string[] {
  const marker = `@media ${query}`;
  const blocks: string[] = [];
  let index = 0;
  for (let start = css.indexOf(marker, index); start >= 0; start = css.indexOf(marker, index)) {
    const end = blockEnd(css, css.indexOf("{", start));
    blocks.push(css.slice(start, end + 1));
    index = end + 1;
  }
  return blocks;
}

/** CSS còn lại sau khi bỏ hết khối `@media`: các rule áp cho mọi khổ màn hình. */
export function globalCss(css: string): string {
  let rest = "";
  let index = 0;
  for (let start = css.indexOf("@media", index); start >= 0; start = css.indexOf("@media", index)) {
    rest += css.slice(index, start);
    index = blockEnd(css, css.indexOf("{", start)) + 1;
  }
  return rest + css.slice(index);
}
