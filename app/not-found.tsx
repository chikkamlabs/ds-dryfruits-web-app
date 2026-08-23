import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="layout-page-container flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <h2 className="text-page-title font-bold text-text-primary mb-2">Page Not Found</h2>
      <p className="text-body text-text-muted mb-6">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link href="/admin/products" className="btn-base btn-primary">
        Return to Products
      </Link>
    </div>
  );
}
