'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Menu, LogOut } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Header component for Admin
export default function AdminHeader(props: any) {
  const router = useRouter();
  const onToggleSidebar = (props?.onToggleSidebar || props?.onOpenSidebar) as (() => void) | undefined;

  const handleLogout = async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_email');
    }
    router.push('/login');
  };

  return (
    <header id="admin-header-bar" className="header-bar w-full">
      {/* Left: Logo and Name with Mobile toggle */}
      <div id="admin-header-left" className="layout-flex-start">
        {onToggleSidebar && (
          <button
            id="mobile-sidebar-toggle-btn"
            type="button"
            onClick={onToggleSidebar}
            className="btn-base btn-ghost btn-icon lg:hidden mr-1"
            aria-label="Toggle Sidebar Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div id="admin-brand" className="layout-flex-start gap-2">
          <Image
            id="admin-header-logo"
            src="/dsdryfruits.png"
            alt="DS Dry Fruits Logo"
            width={36}
            height={36}
            unoptimized
            priority
            referrerPolicy="no-referrer"
          />
          <span id="admin-brand-name" className="text-section-title font-bold hidden sm:inline-block">
            DS Dry Fruits
          </span>
        </div>
      </div>

      {/* Middle: Hello Admin */}
      <div id="admin-header-middle" className="layout-flex-center flex-1 text-center px-2">
        <h1 id="admin-header-greeting" className="text-section-title font-semibold">
          Hello Admin
        </h1>
      </div>

      {/* Right: Logout button */}
      <div id="admin-header-right" className="layout-flex-start">
        <button
          id="admin-logout-btn"
          type="button"
          onClick={handleLogout}
          className="btn-base btn-primary btn-sm"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
