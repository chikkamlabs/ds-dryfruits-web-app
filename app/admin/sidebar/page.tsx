'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
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
  { label: 'Home', href: '/admin/dashboard', icon: Home },
  { label: 'Bills', href: '/admin/bills/dashboard', icon: Receipt },
  { label: 'Purchases', href: '/admin/purchases/dashboard', icon: ShoppingBag },
  { label: 'Customers', href: '/admin/customers/dashboard', icon: Users },
  { label: 'Inventory', href: '/admin/products/dashboard', icon: Boxes },
  { label: 'Categories', href: '/admin/categories/dashboard', icon: Tags },
  { label: 'Distributors', href: '/admin/distributors/dashboard', icon: Truck },
  { label: 'Total Payments', href: '/admin/payments', icon: Wallet },
];

export default function AdminSidebar(props: any) {
  const pathname = usePathname();
  const isOpen = Boolean(props?.isOpen);
  const onClose = props?.onClose as (() => void) | undefined;

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
              (item.label === 'Bills' && (pathname.includes('/admin/bills') || pathname.includes('/admin/createbill') || pathname.includes('/admin/openbill'))) ||
              (item.label === 'Purchases' && pathname.includes('/admin/purchases')) ||
              (item.label === 'Categories' && pathname.includes('/admin/categories')) ||
              (item.label === 'Distributors' && pathname.includes('/admin/distributors')) ||
              (item.label === 'Customers' && pathname.includes('/admin/customers')) ||
              (item.label === 'Inventory' && pathname.includes('/admin/products')) ||
              (item.label === 'Total Payments' && (pathname.includes('/admin/payments') || pathname.includes('/admin/expenses')));

        return (
          <Link
            key={item.label}
            id={`sidebar-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
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
