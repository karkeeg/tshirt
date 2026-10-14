'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch, ApiError } from '@/lib/api';
import Editor2D from '@/components/designer/Editor2D';
import type { LayerData } from '@/components/designer/types';

const DesignerScene = dynamic(() => import('@/components/designer/DesignerScene'), {
  ssr: false,
  loading: () => <div className="h-[560px] w-full animate-pulse" style={{ background: 'var(--color-neutral-200)' }} />,
});

interface ProductColor {
  id: string;
  colorName: string;
  hexCode: string;
  frontImageUrl: string;
}

interface Product {
  id: string;
  name: string;
  variants: ProductColor[];
}

interface DesignLayerDto {
  side: 'FRONT' | 'BACK';
  type: 'IMAGE' | 'TEXT';
  imageUrl: string | null;
  text: string | null;
  fontFamily: string | null;
  fontSize: number | null;
  color: string | null;
  textAlign: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

interface DesignDto {
  id: string;
  productId: string;
  colorId: string;
  status: 'DRAFT' | 'ORDERED';
  layers: DesignLayerDto[];
}

function dtoToLayers(dtoLayers: DesignLayerDto[]): LayerData[] {
  return dtoLayers.map((l) => {
    const base = {
      id: crypto.randomUUID(),
      side: l.side,
      x: l.x,
      y: l.y,
      width: l.width,
      height: l.height,
      rotation: l.rotation,
      zIndex: l.zIndex,
    };
    if (l.type === 'IMAGE') {
      return { ...base, type: 'IMAGE' as const, imageUrl: l.imageUrl ?? '' };
    }
    return {
      ...base,
      type: 'TEXT' as const,
      text: l.text ?? '',
      fontFamily: l.fontFamily ?? 'Barlow Condensed',
      fontSize: l.fontSize ?? 24,
      color: l.color ?? '#1d1f20',
      textAlign: (l.textAlign as 'left' | 'center' | 'right') ?? 'center',
    };
  });
}

function layersToDto(layers: LayerData[]) {
  return layers.map((l) =>
    l.type === 'IMAGE'
      ? {
          side: l.side,
          type: 'IMAGE' as const,
          imageUrl: l.imageUrl,
          x: l.x,
          y: l.y,
          width: l.width,
          height: l.height,
          rotation: l.rotation,
          zIndex: l.zIndex,
        }
      : {
          side: l.side,
          type: 'TEXT' as const,
          text: l.text,
          fontFamily: l.fontFamily,
          fontSize: l.fontSize,
          color: l.color,
          textAlign: l.textAlign,
          x: l.x,
          y: l.y,
          width: l.width,
          height: l.height,
          rotation: l.rotation,
          zIndex: l.zIndex,
        },
  );
}

export default function DesignPage() {
  return (
    <Suspense fallback={<main className="flex-1 p-8">Loading...</main>}>
      <DesignPageInner />
    </Suspense>
  );
}

function DesignPageInner() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [design, setDesign] = useState<DesignDto | null>(null);
  const [layers, setLayers] = useState<LayerData[]>([]);
  const [view, setView] = useState<'2d' | '3d'>('2d');
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user || initialized.current) return;
    initialized.current = true;

    (async () => {
      const products = await apiFetch<Product[]>('/products');
      const firstProduct = products[0] ?? null;
      if (!firstProduct) {
        setProduct(null);
        return;
      }

      const urlDesignId = searchParams.get('designId');
      if (urlDesignId) {
        try {
          const existing = await apiFetch<DesignDto>(`/designs/${urlDesignId}`);
          const matchedProduct = products.find((p) => p.id === existing.productId) ?? firstProduct;
          const matchedColor =
            matchedProduct.variants.find((v) => v.id === existing.colorId) ??
            matchedProduct.variants[0];
          setProduct(matchedProduct);
          setSelectedColor(matchedColor);
          setDesign(existing);
          setLayers(dtoToLayers(existing.layers));
          return;
        } catch {
          // Fall through to starting a fresh draft below if the id is stale/invalid.
        }
      }

      const firstColor = firstProduct.variants[0] ?? null;
      setProduct(firstProduct);
      setSelectedColor(firstColor);
      if (firstColor) {
        const created = await apiFetch<DesignDto>('/designs', {
          method: 'POST',
          body: JSON.stringify({ productId: firstProduct.id, colorId: firstColor.id }),
        });
        setDesign(created);
        setLayers([]);
        router.replace(`/design?designId=${created.id}`, { scroll: false });
      }
    })().catch((err) => {
      setStatus(err instanceof ApiError ? err.message : 'Failed to load the designer');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleColorChange(colorId: string) {
    if (!product || colorId === selectedColor?.id) return;
    const variant = product.variants.find((v) => v.id === colorId);
    if (!variant) return;
    setStatus(null);
    setSelectedColor(variant);
    setDesign(null);
    setLayers([]);
    const created = await apiFetch<DesignDto>('/designs', {
      method: 'POST',
      body: JSON.stringify({ productId: product.id, colorId: variant.id }),
    });
    setDesign(created);
    router.replace(`/design?designId=${created.id}`, { scroll: false });
  }

  async function handleUploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const { url } = await apiFetch<{ url: string }>('/uploads', { method: 'POST', body: formData });
    return url;
  }

  async function saveDesign() {
    if (!design) return null;
    const updated = await apiFetch<DesignDto>(`/designs/${design.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ layers: layersToDto(layers) }),
    });
    setDesign(updated);
    setLayers(dtoToLayers(updated.layers));
    return updated;
  }

  async function handleSave() {
    setSaving(true);
    setStatus(null);
    try {
      await saveDesign();
      setStatus('Saved.');
    } catch (err) {
      setStatus(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleCheckout() {
    if (!design) return;
    setSaving(true);
    setStatus(null);
    try {
      // Checkout reads the design's saved server state, so make sure any
      // local edits are persisted first.
      await saveDesign();
      router.push(`/checkout/${design.id}`);
    } catch (err) {
      setStatus(err instanceof ApiError ? err.message : 'Could not start checkout');
      setSaving(false);
    }
  }

  if (loading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-muted text-sm">Loading...</p>
      </main>
    );
  }

  if (!product || !selectedColor) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-muted text-sm">No product available yet.</p>
      </main>
    );
  }

  const frontImageLogo = layers.find((l) => l.side === 'FRONT' && l.type === 'IMAGE');
  const logoUrlFor3d = frontImageLogo && frontImageLogo.type === 'IMAGE' ? frontImageLogo.imageUrl : null;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h6 className="text-muted mb-1">Custom print · Nepal</h6>
          <h2>{product.name}</h2>
        </div>
        <div className="seg">
          <label className="seg-opt">
            <input type="radio" name="view" checked={view === '2d'} onChange={() => setView('2d')} />
            2D editor
          </label>
          <label className="seg-opt">
            <input type="radio" name="view" checked={view === '3d'} onChange={() => setView('3d')} />
            3D preview
          </label>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {design ? (
          view === '2d' ? (
            <Editor2D
              colorHex={selectedColor.hexCode}
              colors={product.variants}
              selectedColorId={selectedColor.id}
              onColorChange={handleColorChange}
              layers={layers}
              onLayersChange={setLayers}
              onUploadImage={handleUploadImage}
            />
          ) : (
            <DesignerScene color={selectedColor.hexCode} logoUrl={logoUrlFor3d} />
          )
        ) : (
          <div className="flex h-[560px] items-center justify-center">
            <p className="text-muted text-sm">Starting a new draft...</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button onClick={handleSave} disabled={saving || !design || design.status === 'ORDERED'} className="btn btn-secondary">
          {saving ? 'Saving...' : 'Save draft'}
        </button>
        <button
          onClick={handleCheckout}
          disabled={saving || !design || design.status === 'ORDERED' || layers.length === 0}
          className="btn btn-primary"
        >
          {saving ? 'Please wait...' : 'Checkout'}
        </button>
        {design?.status === 'ORDERED' && (
          <span className="text-muted text-sm">This design has already been ordered.</span>
        )}
        {status && (
          <span className="text-sm" style={{ color: status === 'Saved.' ? '#2f7a4f' : '#c0392b' }}>
            {status}
          </span>
        )}
      </div>
    </main>
  );
}
