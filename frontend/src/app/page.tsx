'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <span className="tag tag-outline mb-4" style={{ textTransform: 'uppercase', letterSpacing: '.06em' }}>
        Custom print · Nepal
      </span>
      <h1 className="max-w-xl">Design your own t-shirt</h1>
      <p className="text-muted mt-4 max-w-md text-lg">
        Pick a color, upload your artwork, and see it on the shirt before you order.
      </p>
      <div className="mt-8">
        <Link href={user ? '/design' : '/signup'} className="btn btn-primary blueprint" style={{ padding: '12px 26px', fontSize: 15 }}>
          <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
          {user ? 'Go to designer' : "Start designing — it's free"}
        </Link>
      </div>
    </main>
  );
}
