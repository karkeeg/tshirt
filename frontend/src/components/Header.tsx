'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="nav" style={{ borderBottom: '1px solid var(--color-divider)' }}>
      <Link href="/" className="nav-brand" style={{ letterSpacing: '.02em' }}>
        PRESSWORK
      </Link>
      <nav className="flex items-center gap-4">
        {user ? (
          <>
            <Link href="/design" aria-current="page">
              Designer
            </Link>
            <Link href="/orders">Orders</Link>
            <span className="text-muted text-sm">{user.email}</span>
            <button onClick={logout} className="btn btn-secondary">
              Log out
            </button>
          </>
        ) : (
          <>
            <Link href="/login">Log in</Link>
            <Link href="/signup" className="btn btn-primary">
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
