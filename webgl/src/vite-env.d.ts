/// <reference types="vite/client" />

declare module '*.glsl' {
  const source: string;
  export default source;
}

declare module '*.vert.glsl' {
  const source: string;
  export default source;
}

declare module '*.frag.glsl' {
  const source: string;
  export default source;
}

interface Window {
  folioScroll?: {
    scrollTo: (target: number | HTMLElement, options?: { duration?: number }) => void;
  };
  folioScrollTo?: (element: HTMLElement) => void;
}
