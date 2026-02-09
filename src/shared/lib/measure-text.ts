let measureTextCanvas: HTMLCanvasElement | null = null;

export const measureTextWidth = (text: string, font: string = '12px sans-serif'): number => {
  if (typeof window === 'undefined') return 0;
  if (!measureTextCanvas) {
    measureTextCanvas = document.createElement('canvas');
  }
  const context = measureTextCanvas.getContext('2d');
  if (!context) return text.length * 8;
  context.font = font;
  return context.measureText(text).width;
};
