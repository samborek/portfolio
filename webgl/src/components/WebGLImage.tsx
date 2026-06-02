import { useEffect, useRef } from 'react';

export interface WebGLImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Enable WebGL mirror plane for this image */
  webgl?: boolean;
}

/**
 * Semantic DOM image with optional WebGL registration.
 * Use in React apps; in static Hexo templates, add data-webgl-image on <img> instead.
 */
export function WebGLImage({ webgl = true, ...props }: WebGLImageProps) {
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !webgl) return;
    el.dataset.webglImage = 'true';
    window.dispatchEvent(new CustomEvent('folio:webgl-images-changed'));
  }, [webgl]);

  return <img ref={ref} {...props} data-webgl-image={webgl ? '' : undefined} />;
}
