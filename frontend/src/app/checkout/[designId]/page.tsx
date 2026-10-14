'use client';

import { useEffect, useState, use as usePromise } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch, ApiError } from '@/lib/api';

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;
type Size = (typeof SIZES)[number];

// Mirrors backend/src/orders/orders.service.ts's CUSTOM_DESIGN_SURCHARGE —
// shown here only as a preview; the order response is the source of truth
// for the actual charged total.
const SURCHARGE_PREVIEW = 350;

interface DesignLayerDto {
  side: 'FRONT' | 'BACK';
}

interface DesignDto {
  id: string;
  productId: string;
  colorId: string;
  status: 'DRAFT' | 'ORDERED';
  layers: DesignLayerDto[];
}

interface ProductColor {
  id: string;
  colorName: string;
  hexCode: string;
}

interface Product {
  id: string;
  name: string;
  basePrice: string;
  variants: ProductColor[];
}

interface OrderDto {
  id: string;
}

export default function CheckoutPage({ params }: { params: Promise<{ designId: string }> }) {
  const { designId } = usePromise(params);
  const { user, loading } = useAuth();
  const router = useRouter();

  const [design, setDesign] = useState<DesignDto | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [size, setSize] = useState<Size>('M');
  const [shippingName, setShippingName] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    apiFetch<DesignDto>(`/designs/${designId}`)
      .then(async (d) => {
        setDesign(d);
        const p = await apiFetch<Product>(`/products/${d.productId}`);
        setProduct(p);
      })
      .catch((err) => {
        setLoadError(err instanceof ApiError ? err.message : 'Could not load this design');
      });
  }, [user, designId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const order = await apiFetch<OrderDto>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          designId,
          size,
          shippingName,
          shippingPhone,
          shippingAddress,
          shippingCity,
        }),
      });
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not place your order');
      setSubmitting(false);
    }
  }

  if (loading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-muted text-sm">Loading...</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-muted text-sm">{loadError}</p>
      </main>
    );
  }

  if (!design || !product) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-muted text-sm">Loading...</p>
      </main>
    );
  }

  if (design.status === 'ORDERED') {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <h3>This design has already been ordered</h3>
        <p className="text-muted text-sm">You can start a new design from the designer.</p>
        <a href="/design" className="btn btn-secondary">
          Back to designer
        </a>
      </main>
    );
  }

  const color = product.variants.find((v) => v.id === design.colorId);
  const frontCount = design.layers.filter((l) => l.side === 'FRONT').length;
  const backCount = design.layers.filter((l) => l.side === 'BACK').length;
  const basePrice = Number(product.basePrice);
  const total = basePrice + SURCHARGE_PREVIEW;
  const nf = (n: number) => n.toLocaleString('en-US');

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h2 className="mb-6">Checkout</h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_280px]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="card">
            <h6 className="text-muted">Design</h6>
            <div className="flex items-center gap-3">
              {color && (
                <span
                  style={{
                    display: 'inline-block',
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: color.hexCode,
                    border: '1px solid var(--color-neutral-400)',
                  }}
                />
              )}
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{product.name}</div>
                <div className="text-muted text-xs">
                  {color?.colorName} · Front: {frontCount} layer{frontCount === 1 ? '' : 's'} · Back:{' '}
                  {backCount} layer{backCount === 1 ? '' : 's'}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h6 className="text-muted">Size</h6>
            <div className="seg" style={{ width: '100%' }}>
              {SIZES.map((s) => (
                <label key={s} className="seg-opt" style={{ flex: 1, justifyContent: 'center' }}>
                  <input type="radio" name="size" checked={size === s} onChange={() => setSize(s)} />
                  {s}
                </label>
              ))}
            </div>
          </div>

          <div className="card">
            <h6 className="text-muted">Shipping address (Nepal only)</h6>
            <div className="flex flex-col gap-3">
              <div className="field">
                <label>Full name</label>
                <input
                  className="input"
                  required
                  value={shippingName}
                  onChange={(e) => setShippingName(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Phone</label>
                <input
                  className="input"
                  required
                  value={shippingPhone}
                  onChange={(e) => setShippingPhone(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Address</label>
                <input
                  className="input"
                  required
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                />
              </div>
              <div className="field">
                <label>City</label>
                <input
                  className="input"
                  required
                  value={shippingCity}
                  onChange={(e) => setShippingCity(e.target.value)}
                />
              </div>
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{ marginTop: 3 }}
            />
            <span>
              I understand this is a custom-printed item and is{' '}
              <strong>not eligible for refunds or exchanges</strong>.
            </span>
          </label>

          {submitError && (
            <p className="tag" style={{ background: 'color-mix(in srgb, #c0392b 14%, transparent)', color: '#c0392b' }}>
              {submitError}
            </p>
          )}

          <button type="submit" disabled={!agreed || submitting} className="btn btn-primary">
            {submitting ? 'Placing order...' : 'Place order'}
          </button>
        </form>

        <aside className="card h-fit">
          <h6 className="text-muted">Order summary</h6>
          <div className="flex justify-between text-sm">
            <span className="text-muted">{product.name}</span>
            <span>Rs {nf(basePrice)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Custom print surcharge</span>
            <span>Rs {nf(SURCHARGE_PREVIEW)}</span>
          </div>
          <div
            className="flex items-baseline justify-between pt-2"
            style={{ borderTop: '1px solid var(--color-divider)' }}
          >
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>Total</span>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 20 }}>
              Rs {nf(total)}
            </span>
          </div>
          <p className="text-muted" style={{ fontSize: 11, lineHeight: 1.4 }}>
            Payment isn&apos;t collected online yet — placing an order records it for
            fulfillment; you&apos;ll be contacted to arrange payment.
          </p>
        </aside>
      </div>
    </main>
  );
}
