'use client';

import { useEffect, useState, use as usePromise } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch, ApiError } from '@/lib/api';

interface OrderItemDto {
  id: string;
  size: string;
  unitPrice: string;
  surcharge: string;
  productionStatus: string;
  product: { name: string };
  color: { colorName: string; hexCode: string };
}

interface OrderDto {
  id: string;
  status: string;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  subtotal: string;
  surcharge: string;
  total: string;
  createdAt: string;
  items: OrderItemDto[];
}

export default function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = usePromise(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    apiFetch<OrderDto>(`/orders/${orderId}`)
      .then(setOrder)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load this order'));
  }, [user, orderId]);

  if (loading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-muted text-sm">Loading...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-muted text-sm">{error}</p>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-muted text-sm">Loading...</p>
      </main>
    );
  }

  const nf = (n: string) => Number(n).toLocaleString('en-US');

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <span className="tag tag-accent mb-3" style={{ display: 'inline-block' }}>
        Order placed
      </span>
      <h2 className="mb-1">Thanks — order {order.id.slice(-8).toUpperCase()}</h2>
      <p className="text-muted mb-6 text-sm">
        Placed {new Date(order.createdAt).toLocaleString()}. We&apos;ll be in touch to arrange
        payment and confirm production.
      </p>

      <div className="card mb-4">
        <h6 className="text-muted">Items</h6>
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                style={{
                  display: 'inline-block',
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: item.color.hexCode,
                  border: '1px solid var(--color-neutral-400)',
                }}
              />
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{item.product.name}</div>
                <div className="text-muted text-xs">
                  {item.color.colorName} · Size {item.size} · {item.productionStatus.replace('_', ' ')}
                </div>
              </div>
            </div>
            <span>Rs {nf((Number(item.unitPrice) + Number(item.surcharge)).toString())}</span>
          </div>
        ))}
      </div>

      <div className="card mb-4">
        <h6 className="text-muted">Shipping to</h6>
        <p style={{ margin: 0, fontSize: 14 }}>
          {order.shippingName}
          <br />
          {order.shippingAddress}, {order.shippingCity}
          <br />
          {order.shippingPhone}
        </p>
      </div>

      <div className="card mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Subtotal</span>
          <span>Rs {nf(order.subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">Custom print surcharge</span>
          <span>Rs {nf(order.surcharge)}</span>
        </div>
        <div
          className="flex items-baseline justify-between pt-2"
          style={{ borderTop: '1px solid var(--color-divider)' }}
        >
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>Total</span>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 20 }}>
            Rs {nf(order.total)}
          </span>
        </div>
      </div>

      <p className="text-muted mb-6 text-xs">
        Custom items are not eligible for refunds or exchanges.
      </p>

      <Link href="/orders" className="btn btn-secondary">
        Back to your orders
      </Link>
    </main>
  );
}
