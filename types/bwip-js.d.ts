declare module 'bwip-js' {
  export interface ToOptions {
    bcid: string;
    text: string;
    scale?: number;
    scaleX?: number;
    scaleY?: number;
    height?: number;
    width?: number;
    includetext?: boolean;
    textxalign?: 'off' | 'left' | 'center' | 'right' | 'justify';
    textyalign?: 'below' | 'center' | 'above';
    textsize?: number;
    textcolor?: string;
    backgroundcolor?: string;
    paddingwidth?: number;
    paddingheight?: number;
    monochrome?: boolean;
    rotate?: 'N' | 'R' | 'L' | 'I';
    [key: string]: unknown;
  }

  export function toCanvas(canvas: HTMLCanvasElement | string, opts: ToOptions): HTMLCanvasElement;
  export function toCanvas(canvas: HTMLCanvasElement | string, opts: ToOptions, callback: (err: Error | null, canvas: HTMLCanvasElement) => void): void;
  export function toSVG(opts: ToOptions): string;
  export function toSVG(opts: ToOptions, callback: (err: Error | null, svg: string) => void): void;
  export function toBuffer(opts: ToOptions): Promise<Buffer>;
  export function toBuffer(opts: ToOptions, callback: (err: Error | null, png: Buffer) => void): void;

  const bwipjs: {
    toCanvas: typeof toCanvas;
    toSVG: typeof toSVG;
    toBuffer: typeof toBuffer;
  };

  export default bwipjs;
}
