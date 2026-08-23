'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!isSupabaseConfigured) {
        setError('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
        setLoading(false);
        return;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError('Authentication failed. No user found.');
        setLoading(false);
        return;
      }

      // Query role from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      const userRole = (profile as { role?: string } | null)?.role || (data.user.user_metadata?.role as string);

      if (userRole === 'admin') {
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_role', 'admin');
          localStorage.setItem('user_email', data.user.email || email);
        }
        router.push('/admin/dashboard');
      } else {
        setError('Access denied: Admin role required.');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred during login.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="login-page-container" className="layout-page-container layout-flex-center p-4">
      <div id="login-card" className="card-base max-w-md w-full p-8 animate-fade-in">
        <div id="login-header" className="layout-flex-center flex-col text-center mb-6">
          <div id="logo-container" className="mb-4">
            <Image
              id="app-logo"
              src="/dsdryfruits.png"
              alt="DS Dry Fruits Logo"
              width={88}
              height={88}
              priority
              unoptimized
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 id="login-title" className="text-page-title mb-1">
            Welcome to DS Dry Fruits
          </h1>
          <p id="login-subtitle" className="text-subtitle">
            Sign in to access your management dashboard
          </p>
        </div>

        <form id="login-form" onSubmit={handleLogin} className="layout-section">
          {error && (
            <div id="login-error-message" className="badge-danger p-3 rounded-md text-small">
              {error}
            </div>
          )}

          <div id="email-form-group" className="form-group">
            <label id="email-label" htmlFor="email-input" className="form-label">
              Email Address
            </label>
            <input
              id="email-input"
              type="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              placeholder="Enter your email"
              className="input-base"
            />
          </div>

          <div id="password-form-group" className="form-group">
            <label id="password-label" htmlFor="password-input" className="form-label">
              Password
            </label>
            <input
              id="password-input"
              type="password"
              required
              disabled={loading}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="Enter your password"
              className="input-base"
            />
          </div>

          <button
            id="login-submit-button"
            type="submit"
            disabled={loading}
            className="btn-base btn-primary btn-lg w-full mt-2"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </main>
  );
}

