'use client';

import { useEffect, useRef, useState } from 'react';
import type { LayerData, TextAlign } from './types';
import { SHIRT_VIEWBOX, SHIRT_PATH, SHIRT_COLLAR_PATH, PRINT_BOX, PRINT_AREA_CM } from './shirtPath';
import { getImageDimensions, effectiveDpi, isLowRes } from '@/lib/imageMeta';

const STAGE_W = 420;
const STAGE_H = 500;

const FONTS = ['Barlow Condensed', 'Barlow', 'Georgia', 'Courier New'];
const INKS = [
  { name: 'Ink', hex: '#1d1f20' },
  { name: 'Paper', hex: '#f5f5f8' },
  { name: 'Steel', hex: '#5980a6' },
  { name: 'Deep steel', hex: '#1d2d3d' },
];
const ALIGNS: { id: TextAlign; label: string }[] = [
  { id: 'left', label: 'Left' },
  { id: 'center', label: 'Centre' },
  { id: 'right', label: 'Right' },
];

interface ColorOption {
  id: string;
  colorName: string;
  hexCode: string;
}

interface Props {
  colorHex: string;
  colors: ColorOption[];
  selectedColorId: string;
  onColorChange: (id: string) => void;
  layers: LayerData[];
  onLayersChange: (layers: LayerData[]) => void;
  onUploadImage: (file: File) => Promise<string>;
}

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'l' + Math.random().toString(36).slice(2);
}

function darkGarment(hex: string) {
  const v = parseInt(hex.replace('#', ''), 16);
  const r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255;
  return (r * 0.299 + g * 0.587 + b * 0.114) < 140;
}

export default function Editor2D({
  colorHex,
  colors,
  selectedColorId,
  onColorChange,
  layers,
  onLayersChange,
  onUploadImage,
}: Props) {
  const [side, setSide] = useState<'FRONT' | 'BACK'>('FRONT');
  const [selId, setSelId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [dpiById, setDpiById] = useState<Record<string, number>>({});
  const stageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sideLayers = layers.filter((l) => l.side === side).sort((a, b) => a.zIndex - b.zIndex);
  const selected = layers.find((l) => l.id === selId) ?? null;
  const dark = darkGarment(colorHex);
  const scaleFactor = zoom * fit;
  const printBox = PRINT_BOX;

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const v = Math.min(1, (el.clientHeight - 32) / STAGE_H, (el.clientWidth - 32) / STAGE_W);
      setFit(Math.max(0.35, +v.toFixed(3)));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  // Real (non-blocking) low-res check for every image layer on this side.
  useEffect(() => {
    let cancelled = false;
    sideLayers
      .filter((l): l is Extract<LayerData, { type: 'IMAGE' }> => l.type === 'IMAGE')
      .forEach((l) => {
        getImageDimensions(l.imageUrl).then(({ width }) => {
          if (cancelled) return;
          const dpi = effectiveDpi(width, l.width, printBox.w, PRINT_AREA_CM.w);
          setDpiById((prev) => ({ ...prev, [l.id]: dpi }));
        });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sideLayers.map((l) => (l.type === 'IMAGE' ? `${l.id}:${l.imageUrl}:${l.width}` : '')).join(',')]);

  function replaceLayer(id: string, patch: Partial<LayerData>) {
    onLayersChange(layers.map((l) => (l.id === id ? ({ ...l, ...patch } as LayerData) : l)));
  }

  function addText() {
    const id = newId();
    const maxZ = Math.max(0, ...sideLayers.map((l) => l.zIndex));
    onLayersChange([
      ...layers,
      {
        id,
        side,
        type: 'TEXT',
        x: 26,
        y: 84,
        width: 104,
        height: 32,
        rotation: 0,
        zIndex: maxZ + 1,
        text: 'Your text',
        fontFamily: 'Barlow Condensed',
        fontSize: 24,
        color: dark ? '#f5f5f8' : '#1d1f20',
        textAlign: 'center',
      },
    ]);
    setSelId(id);
  }

  async function handleFileChosen(file: File) {
    setUploading(true);
    try {
      const url = await onUploadImage(file);
      const id = newId();
      const maxZ = Math.max(0, ...sideLayers.map((l) => l.zIndex));
      onLayersChange([
        ...layers,
        {
          id,
          side,
          type: 'IMAGE',
          x: 30,
          y: 52,
          width: 96,
          height: 84,
          rotation: 0,
          zIndex: maxZ + 1,
          imageUrl: url,
        },
      ]);
      setSelId(id);
    } finally {
      setUploading(false);
    }
  }

  function moveLayer(id: string, dir: 1 | -1) {
    const i = sideLayers.findIndex((l) => l.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= sideLayers.length) return;
    const a = sideLayers[i], b = sideLayers[j];
    replaceLayer(a.id, { zIndex: b.zIndex });
    replaceLayer(b.id, { zIndex: a.zIndex });
  }

  function deleteLayer(id: string) {
    onLayersChange(layers.filter((l) => l.id !== id));
    if (selId === id) setSelId(null);
  }

  function duplicateLayer(l: LayerData) {
    const id = newId();
    const maxZ = Math.max(0, ...sideLayers.map((x) => x.zIndex));
    onLayersChange([...layers, { ...l, id, x: l.x + 10, y: l.y + 10, zIndex: maxZ + 1 }]);
    setSelId(id);
  }

  function startDrag(l: LayerData) {
    return (e: React.PointerEvent) => {
      e.preventDefault();
      setSelId(l.id);
      const z = scaleFactor, sx = e.clientX, sy = e.clientY, ox = l.x, oy = l.y, box = printBox;
      const onMove = (ev: PointerEvent) => {
        replaceLayer(l.id, {
          x: Math.max(-16, Math.min(box.w - 18, ox + (ev.clientX - sx) / z)),
          y: Math.max(-16, Math.min(box.h - 18, oy + (ev.clientY - sy) / z)),
        });
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };
  }

  function startResize(l: LayerData) {
    return (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const z = scaleFactor, sx = e.clientX, sy = e.clientY, box = printBox;
      const baseW = l.width, baseH = l.height, baseSize = l.type === 'TEXT' ? l.fontSize : 0;
      const onMove = (ev: PointerEvent) => {
        const dx = (ev.clientX - sx) / z, dy = (ev.clientY - sy) / z;
        const f = Math.max(0.35, 1 + (dx / baseW + dy / baseH) / 2);
        // Clamp so the layer can't be resized past the print boundary from
        // its current (fixed, top-left) anchor — resize doesn't move x/y.
        const maxW = Math.max(10, box.w - l.x);
        const maxH = Math.max(10, box.h - l.y);
        const width = Math.min(maxW, Math.round(baseW * f));
        const height = Math.min(maxH, Math.round(baseH * f));
        if (l.type === 'TEXT') {
          replaceLayer(l.id, { width, height, fontSize: Math.round(Math.min(64, Math.max(10, baseSize * f))) });
        } else {
          replaceLayer(l.id, { width, height });
        }
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };
  }

  const shirtStroke = dark ? 'color-mix(in srgb, #f5f5f8 45%, transparent)' : '#98989b';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[236px_minmax(0,1fr)_280px]" style={{ minHeight: 560 }}>
      {/* Left: add, color, layers */}
      <div style={{ borderRight: '1px solid var(--color-divider)' }} className="flex flex-col">
        <div className="flex flex-col gap-2 p-4">
          <h6 className="text-muted">Add</h6>
          <button
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start' }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload image'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) handleFileChosen(file);
            }}
          />
          <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={addText}>
            Add text
          </button>
        </div>

        <div className="p-4" style={{ borderTop: '1px solid var(--color-divider)' }}>
          <h6 className="text-muted mb-2">Garment colour</h6>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <button
                key={c.id}
                title={c.colorName}
                aria-label={c.colorName}
                onClick={() => onColorChange(c.id)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  padding: 0,
                  background: c.hexCode,
                  border: '1px solid var(--color-neutral-400)',
                  boxShadow:
                    c.id === selectedColorId
                      ? '0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-accent)'
                      : 'none',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col" style={{ borderTop: '1px solid var(--color-divider)' }}>
          <div className="flex items-center px-4 pt-3 pb-2">
            <h6 className="text-muted">Layers — {side === 'FRONT' ? 'Front' : 'Back'}</h6>
            <span className="text-muted ml-auto text-xs">{sideLayers.length}</span>
          </div>
          <div className="flex-1 overflow-auto px-2 pb-3">
            {sideLayers.length === 0 && (
              <p className="text-muted px-2 text-xs">Nothing on this side yet.</p>
            )}
            {sideLayers
              .slice()
              .reverse()
              .map((l) => (
                <div
                  key={l.id}
                  onClick={() => setSelId(l.id)}
                  className="flex cursor-pointer items-center gap-1.5 px-1.5 py-1.5"
                  style={{
                    background:
                      l.id === selId ? 'color-mix(in srgb, var(--color-accent) 18%, transparent)' : 'transparent',
                    borderLeft: l.id === selId ? '2px solid var(--color-accent)' : '2px solid transparent',
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs">
                      {l.type === 'TEXT' ? l.text || 'Text' : 'Image'}
                    </div>
                    <div className="text-muted text-[10px] uppercase tracking-wide">
                      {l.type === 'TEXT' ? 'Text' : 'Image'}
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '2px 4px', fontSize: 11 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveLayer(l.id, 1);
                    }}
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '2px 4px', fontSize: 11 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveLayer(l.id, -1);
                    }}
                    title="Move down"
                  >
                    ▼
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '2px 4px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteLayer(l.id);
                    }}
                    title="Delete layer"
                  >
                    ✕
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Center: stage */}
      <div
        ref={stageRef}
        style={{ background: 'var(--color-neutral-200)', position: 'relative' }}
        className="flex min-h-0 items-center justify-center overflow-hidden"
      >
        <div className="absolute top-3.5 left-4 flex items-center gap-2" style={{ zIndex: 2 }}>
          <span className="tag tag-outline" style={{ letterSpacing: '.08em', textTransform: 'uppercase' }}>
            {side === 'FRONT' ? 'Front' : 'Back'}
          </span>
          <span className="text-muted text-xs">Print area {PRINT_AREA_CM.w} × {PRINT_AREA_CM.h} cm</span>
        </div>

        <div className="absolute top-3.5 right-4" style={{ zIndex: 2 }}>
          <div className="seg">
            <label className="seg-opt">
              <input type="radio" name="side" checked={side === 'FRONT'} onChange={() => { setSide('FRONT'); setSelId(null); }} />
              Front
            </label>
            <label className="seg-opt">
              <input type="radio" name="side" checked={side === 'BACK'} onChange={() => { setSide('BACK'); setSelId(null); }} />
              Back
            </label>
          </div>
        </div>

        <div style={{ transform: `scale(${scaleFactor})`, transformOrigin: 'center', flex: 'none' }}>
          <div style={{ position: 'relative', width: STAGE_W, height: STAGE_H }}>
            {/* Flat, tinted vector shirt for both sides — see
                docs/features/custom-designer.md for why a real photo was
                tried and reverted (repeated masking/edge-quality issues
                with no reliable fix available in this environment). This
                renders identically for front and back, just a fill color
                on an SVG path — no masking, no artifacts, always crisp. */}
            <svg
              viewBox={SHIRT_VIEWBOX}
              width={STAGE_W}
              height={STAGE_H}
              style={{ filter: 'drop-shadow(0 12px 26px rgba(0,0,0,.28))', pointerEvents: 'none' }}
              aria-hidden
            >
              <path d={SHIRT_PATH} fill={colorHex} stroke={shirtStroke} strokeWidth={1.5} />
              <path d={SHIRT_COLLAR_PATH} fill="none" stroke={shirtStroke} strokeWidth={1.5} />
            </svg>

            <div
              style={{
                position: 'absolute',
                left: printBox.x,
                top: printBox.y,
                width: printBox.w,
                height: printBox.h,
                border: `1px dashed ${dark ? 'rgba(245,245,248,.62)' : 'color-mix(in srgb, #5980a6 75%, transparent)'}`,
              }}
            >
              {sideLayers.length === 0 && (
                <div className="absolute inset-0 grid place-items-center p-4 text-center">
                  <div
                    style={{
                      fontSize: 12,
                      lineHeight: 1.4,
                      maxWidth: '20ch',
                      margin: '0 auto',
                      color: dark ? '#eef6ff' : '#2c455d',
                    }}
                  >
                    Upload an image or add text to start designing this side
                  </div>
                </div>
              )}

              {sideLayers.map((l) => {
                const isSel = l.id === selId;
                const boxStyle: React.CSSProperties = {
                  position: 'absolute',
                  left: l.x,
                  top: l.y,
                  width: l.width,
                  height: l.height,
                  transform: `rotate(${l.rotation}deg)`,
                  cursor: 'grab',
                  touchAction: 'none',
                  outline: isSel ? '1px solid var(--color-accent)' : '1px solid transparent',
                };
                return (
                  <div key={l.id} style={boxStyle} onPointerDown={startDrag(l)}>
                    {l.type === 'TEXT' ? (
                      <div
                        style={{
                          fontFamily: `"${l.fontFamily}", sans-serif`,
                          fontSize: l.fontSize,
                          lineHeight: 1.15,
                          color: l.color,
                          textAlign: l.textAlign,
                          width: '100%',
                          letterSpacing: '.02em',
                          fontWeight: l.fontFamily === 'Barlow Condensed' ? 600 : 500,
                          userSelect: 'none',
                        }}
                      >
                        {l.text}
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={l.imageUrl}
                        alt=""
                        draggable={false}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', userSelect: 'none' }}
                      />
                    )}
                    {isSel && (
                      <span
                        onPointerDown={startResize(l)}
                        style={{
                          position: 'absolute',
                          right: -5,
                          bottom: -5,
                          width: 11,
                          height: 11,
                          background: 'var(--color-accent)',
                          cursor: 'nwse-resize',
                          touchAction: 'none',
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className="absolute right-4 bottom-4 flex items-center"
          style={{ border: '1px solid var(--color-divider)', background: 'var(--color-bg)', zIndex: 2 }}
        >
          <button
            className="btn btn-ghost"
            style={{ width: 30, height: 30, padding: 0, border: 0 }}
            onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(2)))}
          >
            −
          </button>
          <span className="text-muted text-xs" style={{ minWidth: 44, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            className="btn btn-ghost"
            style={{ width: 30, height: 30, padding: 0, border: 0 }}
            onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(2)))}
          >
            +
          </button>
        </div>
      </div>

      {/* Right: properties */}
      <div style={{ borderLeft: '1px solid var(--color-divider)' }} className="overflow-auto p-4">
        {!selected && (
          <>
            <h6 className="text-muted mb-2">Properties</h6>
            <p className="text-muted text-sm">
              Select a layer on the shirt or in the list to edit it. Drag to move, pull the corner handle to
              resize.
            </p>
          </>
        )}

        {selected && (
          <div className="flex flex-col gap-4">
            <div>
              <h6 className="text-muted mb-1">{selected.type === 'TEXT' ? 'Text layer' : 'Image layer'}</h6>
              <div className="truncate" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 16 }}>
                {selected.type === 'TEXT' ? selected.text || 'Text' : 'Image'}
              </div>
            </div>

            {selected.type === 'TEXT' && (
              <div className="flex flex-col gap-3.5">
                <div className="field">
                  <label>Text</label>
                  <textarea
                    className="input"
                    style={{ minHeight: 56 }}
                    value={selected.text}
                    onChange={(e) => replaceLayer(selected.id, { text: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Typeface</label>
                  <select
                    className="input"
                    value={selected.fontFamily}
                    onChange={(e) => replaceLayer(selected.id, { fontFamily: e.target.value })}
                  >
                    {FONTS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Size — {selected.fontSize} pt</label>
                  <input
                    type="range"
                    min={10}
                    max={64}
                    step={1}
                    value={selected.fontSize}
                    onChange={(e) => replaceLayer(selected.id, { fontSize: +e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Rotation — {selected.rotation}°</label>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={selected.rotation}
                    onChange={(e) => replaceLayer(selected.id, { rotation: +e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Ink</label>
                  <div className="flex gap-2">
                    {INKS.map((k) => (
                      <button
                        key={k.hex}
                        aria-label={k.name}
                        onClick={() => replaceLayer(selected.id, { color: k.hex })}
                        style={{
                          width: 24,
                          height: 24,
                          padding: 0,
                          cursor: 'pointer',
                          background: k.hex,
                          border: '1px solid var(--color-neutral-400)',
                          boxShadow:
                            selected.color === k.hex
                              ? '0 0 0 2px var(--color-bg), 0 0 0 3px var(--color-accent)'
                              : 'none',
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label>Alignment</label>
                  <div className="seg" style={{ width: '100%' }}>
                    {ALIGNS.map((a) => (
                      <label key={a.id} className="seg-opt" style={{ flex: 1, justifyContent: 'center' }}>
                        <input
                          type="radio"
                          name="align"
                          checked={selected.textAlign === a.id}
                          onChange={() => replaceLayer(selected.id, { textAlign: a.id })}
                        />
                        {a.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {selected.type === 'IMAGE' && (
              <div className="flex flex-col gap-3.5">
                <div className="field">
                  <label>Rotation — {selected.rotation}°</label>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={selected.rotation}
                    onChange={(e) => replaceLayer(selected.id, { rotation: +e.target.value })}
                  />
                </div>
                {(() => {
                  const dpi = dpiById[selected.id];
                  if (dpi === undefined) return null;
                  const low = isLowRes(dpi);
                  return (
                    <>
                      <div className="text-muted flex justify-between text-xs">
                        <span>Effective resolution</span>
                        <span>{Number.isFinite(dpi) ? `≈ ${Math.round(dpi)} dpi` : '—'}</span>
                      </div>
                      {low && (
                        <div
                          className="flex gap-2 p-2.5"
                          style={{ border: '1px solid #8a6f2c', background: 'rgba(217,173,79,.12)' }}
                        >
                          <span style={{ fontSize: 11.5, lineHeight: 1.45, color: '#e6c982' }}>
                            This image may look blurry at its current size — try a larger file or a smaller
                            placement.
                          </span>
                        </div>
                      )}
                    </>
                  );
                })()}
                <button
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Replace image
                </button>
              </div>
            )}

            <div className="flex gap-2 pt-1" style={{ borderTop: '1px solid var(--color-divider)' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, marginTop: 10 }}
                onClick={() => duplicateLayer(selected)}
              >
                Duplicate
              </button>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, marginTop: 10 }}
                onClick={() => deleteLayer(selected.id)}
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
