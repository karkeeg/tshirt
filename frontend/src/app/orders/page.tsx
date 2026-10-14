'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch, ApiError } from '@/lib/api';

interface OrderItemDto {
  id: string;
  size: string;
  productionStatus: string;
  product: { name: string };
  color: { colorName: string; hexCode: string };
}

interface OrderDto {
  id: string;
  status: string;
  total: string;
  createdAt: string;
  items: OrderItemDto[];
}

export default function OrdersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    apiFetch<OrderDto[]>('/orders')
      .then(setOrders)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load orders'));
  }, [user]);

  if (loading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-muted text-sm">Loading...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h2 className="mb-6">Your orders</h2>

      {error && <p className="text-muted text-sm">{error}</p>}

      {orders && orders.length === 0 && (
        <p className="text-muted text-sm">
          No orders yet.{' '}
          <Link href="/design" style={{ color: 'var(--color-text)', fontWeight: 600 }}>
            Start designing
          </Link>
          .
        </p>
      )}

      <div className="flex flex-col gap-3">
        {orders?.map((order) => (
          <Link key={order.id} href={`/orders/${order.id}`} className="card" style={{ textDecoration: 'none' }}>
            <div className="flex items-center justify-between">
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                  {order.items.map((i) => i.product.name).join(', ')}
                </div>
                <div className="text-muted text-xs">
                  {new Date(order.createdAt).toLocaleDateString()} · {order.items.length} item
                  {order.items.length === 1 ? '' : 's'}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="tag tag-neutral">{order.items[0]?.productionStatus.replace('_', ' ')}</span>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                  Rs {Number(order.total).toLocaleString('en-US')}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
