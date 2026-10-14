const cache = new Map<string, Promise<{ width: number; height: number }>>();

/** Loads an image URL off-screen to read its natural pixel dimensions. */
export function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  const cached = cache.get(url);
  if (cached) return cached;

  const promise = new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = url;
  });
  cache.set(url, promise);
  return promise;
}

const CM_TO_INCH = 1 / 2.54;
const MIN_SAFE_DPI = 150;

/**
 * Effective print resolution for an image layer, given the fixed print-box
 * size (in the same stage units as the layer) representing a known
 * real-world area. Non-blocking — just a heads-up, per the project brief.
 */
export function effectiveDpi(
  naturalWidthPx: number,
  layerWidthUnits: number,
  printBoxWidthUnits: number,
  printAreaWidthCm: number,
): number {
  const printedWidthCm = (layerWidthUnits / printBoxWidthUnits) * printAreaWidthCm;
  const printedWidthInches = printedWidthCm * CM_TO_INCH;
  if (printedWidthInches <= 0) return Infinity;
  return naturalWidthPx / printedWidthInches;
}

export function isLowRes(dpi: number): boolean {
  return dpi < MIN_SAFE_DPI;
}
