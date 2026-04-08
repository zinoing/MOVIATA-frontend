declare module 'dom-to-image-more' {
  interface Options {
    width?: number;
    height?: number;
    style?: Partial<CSSStyleDeclaration>;
    quality?: number;
    bgcolor?: string;
    filter?: (node: HTMLElement) => boolean;
  }
  function toPng(node: HTMLElement, options?: Options): Promise<string>;
  function toJpeg(node: HTMLElement, options?: Options): Promise<string>;
  function toBlob(node: HTMLElement, options?: Options): Promise<Blob>;
  function toSvg(node: HTMLElement, options?: Options): Promise<string>;
  const domtoimage: { toPng: typeof toPng; toJpeg: typeof toJpeg; toBlob: typeof toBlob; toSvg: typeof toSvg };
  export default domtoimage;
  export { toPng, toJpeg, toBlob, toSvg };
}