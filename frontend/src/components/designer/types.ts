export interface BaseLayer {
  id: string;
  side: 'FRONT' | 'BACK';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

export interface ImageLayerData extends BaseLayer {
  type: 'IMAGE';
  imageUrl: string;
}

export type TextAlign = 'left' | 'center' | 'right';

export interface TextLayerData extends BaseLayer {
  type: 'TEXT';
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  textAlign: TextAlign;
}

export type LayerData = ImageLayerData | TextLayerData;
