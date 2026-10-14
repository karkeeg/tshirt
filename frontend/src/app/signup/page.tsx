'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup(email, password);
      router.push('/design');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex w-full flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="card w-full max-w-sm" style={{ padding: 'var(--space-6)' }}>
        <h3>Create your account</h3>
        <p className="text-muted" style={{ marginTop: -4 }}>Save drafts and reorder past designs.</p>
        <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-4">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </div>
          {error && (
            <p className="tag" style={{ background: 'color-mix(in srgb, #c0392b 14%, transparent)', color: '#c0392b' }}>
              {error}
            </p>
          )}
          <button type="submit" disabled={submitting} className="btn btn-primary btn-block">
            {submitting ? 'Creating account...' : 'Sign up'}
          </button>
        </form>
        <p className="text-muted mt-6 text-center text-sm">
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--color-text)', fontWeight: 600 }}>
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
