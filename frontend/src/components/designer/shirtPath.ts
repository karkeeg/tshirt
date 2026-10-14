// Flat t-shirt silhouette used as the 2D editor stage — one shape, tinted
// per color in code (matches the project brief: "one base shirt image,
// tinted in code, no separate photos needed"). Front and back share this
// same silhouette since there's no separate back photo. Viewbox is 420x500.
export const SHIRT_VIEWBOX = '0 0 420 500';
export const SHIRT_PATH =
  'M 152 30 C 138 34 120 44 106 52 L 70 132 L 104 156 L 108 146 L 112 402 C 112 410 118 414 126 414 L 294 414 C 302 414 308 410 308 402 L 312 146 L 316 156 L 350 132 L 314 52 C 300 44 282 34 268 30 C 252 52 168 52 152 30 Z';
export const SHIRT_COLLAR_PATH = 'M 158 38 C 174 58 246 58 262 38';

// Fixed print boundary — represents a real 30 x 40 cm print area (used for
// the DPI/low-res warning calculation in lib/imageMeta.ts).
export const PRINT_BOX = { x: 132, y: 168, w: 156, h: 208 };
export const PRINT_AREA_CM = { w: 30, h: 40 };
