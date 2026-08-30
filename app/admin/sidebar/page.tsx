'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Receipt,
  ShoppingBag,
  Users,
  Boxes,
  Tags,
  Truck,
  Wallet,
  X,
} from 'lucide-react';

const ADMIN_SIDEBAR_ITEMS = [
  { key: 'home', label: 'Home (F1)', shortcut: 'F1', href: '/admin/dashboard', icon: Home },
  { key: 'bills', label: 'Bills (F2)', shortcut: 'F2', href: '/admin/bills/dashboard', icon: Receipt },
  { key: 'purchases', label: 'Purchases (F3)', shortcut: 'F3', href: '/admin/purchases/dashboard', icon: ShoppingBag },
  { key: 'customers', label: 'Customers (F4)', shortcut: 'F4', href: '/admin/customers/dashboard', icon: Users },
  { key: 'inventory', label: 'Inventory (F5)', shortcut: 'F5', href: '/admin/products/dashboard', icon: Boxes },
  { key: 'categories', label: 'Categories (F6)', shortcut: 'F6', href: '/admin/categories/dashboard', icon: Tags },
  { key: 'distributors', label: 'Distributors (F7)', shortcut: 'F7', href: '/admin/distributors/dashboard', icon: Truck },
  { key: 'payments', label: 'Total Payments (F8)', shortcut: 'F8', href: '/admin/payments', icon: Wallet },
];

export default function AdminSidebar(props: any) {
  const pathname = usePathname();
  const router = useRouter();
  const isOpen = Boolean(props?.isOpen);
  const onClose = props?.onClose as (() => void) | undefined;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const shortcutMap: Record<string, string> = {
        F1: '/admin/dashboard',
        F2: '/admin/bills/dashboard',
        F3: '/admin/purchases/dashboard',
        F4: '/admin/customers/dashboard',
        F5: '/admin/products/dashboard',
        F6: '/admin/categories/dashboard',
        F7: '/admin/distributors/dashboard',
        F8: '/admin/payments',
      };

      if (shortcutMap[e.key]) {
        e.preventDefault();
        if (onClose) {
          onClose();
        }
        router.push(shortcutMap[e.key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [router, onClose]);

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  const navContent = (
    <nav id="admin-sidebar-navigation" className="sidebar-nav flex-1 overflow-y-auto">
      {ADMIN_SIDEBAR_ITEMS.map((item) => {
        const IconComponent = item.icon;
        const isActive =
          item.href === '/admin/dashboard'
            ? pathname === '/admin/dashboard'
            : pathname.startsWith(item.href) ||
              (item.key === 'bills' && (pathname.includes('/admin/bills') || pathname.includes('/admin/createbill') || pathname.includes('/admin/openbill'))) ||
              (item.key === 'purchases' && pathname.includes('/admin/purchases')) ||
              (item.key === 'categories' && pathname.includes('/admin/categories')) ||
              (item.key === 'distributors' && pathname.includes('/admin/distributors')) ||
              (item.key === 'customers' && pathname.includes('/admin/customers')) ||
              (item.key === 'inventory' && pathname.includes('/admin/products')) ||
              (item.key === 'payments' && (pathname.includes('/admin/payments') || pathname.includes('/admin/expenses')));

        return (
          <Link
            key={item.key}
            id={`sidebar-item-${item.key}`}
            href={item.href}
            onClick={handleLinkClick}
            className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : ''}`}
          >
            <IconComponent className="w-5 h-5 flex-shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const sidebarFooter = (
    <div
      id="admin-sidebar-footer"
      className="p-3 border-t border-subtle layout-flex-between mt-auto bg-surface"
    >
      <span id="admin-sidebar-role" className="text-label font-semibold text-primary">
        Admin
      </span>
      <span id="admin-sidebar-version" className="badge-base badge-secondary text-caption font-bold">
        V1
      </span>
    </div>
  );

  return (
    <>
      {/* Laptop / Desktop Permanent Sidebar (sticky to left side, does not scroll with dashboard) */}
      <aside id="desktop-admin-sidebar" className="hidden lg:flex sidebar-shell flex-col h-full shrink-0">
        {navContent}
        {sidebarFooter}
      </aside>

      {/* Mobile Drawer (open on tap, close on tap via backdrop, X button, or link click) */}
      {isOpen && (
        <div id="mobile-sidebar-drawer" className="lg:hidden">
          {/* Backdrop overlay */}
          <div
            id="mobile-sidebar-backdrop"
            className="drawer-overlay animate-fade-in"
            onClick={() => {
              if (onClose) onClose();
            }}
            aria-hidden="true"
          />

          {/* Slide-out Panel from left */}
          <div
            id="mobile-sidebar-panel"
            className="drawer-panel-left animate-fade-in flex flex-col h-full"
          >
            <div className="header-bar px-4 layout-flex-between">
              <div className="layout-flex-start gap-2">
                <Image
                  id="mobile-sidebar-logo"
                  src="/dsdryfruits.png"
                  alt="DS Dry Fruits Logo"
                  width={28}
                  height={28}
                  unoptimized
                  priority
                  referrerPolicy="no-referrer"
                />
                <span className="text-section-title font-bold">DS Dry Fruits</span>
              </div>
              <button
                id="close-mobile-sidebar-btn"
                type="button"
                onClick={() => {
                  if (onClose) onClose();
                }}
                className="btn-base btn-ghost btn-icon-sm"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {navContent}
            {sidebarFooter}
          </div>
        </div>
      )}
    </>
  );
}
