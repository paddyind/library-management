import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

/**
 * Higher Order Component to protect routes that require authentication
 * Usage: export default withAuth(YourComponent);
 */
export function withAuth(Component, options = {}) {
  const { requireRole = null, requireRoles = null } = options;

  return function ProtectedRoute(props) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      // Wait for auth to finish loading
      if (loading) return;

      // Redirect to login if not authenticated
      if (!user) {
        const currentPath = router.asPath;
        router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
        return;
      }

      // Check role requirement if specified
      const allowedRoles = requireRoles || (requireRole ? [requireRole] : null);
      if (allowedRoles && allowedRoles.length > 0) {
        const userRole = user.role?.toLowerCase();
        const hasAccess = allowedRoles.some(role => role.toLowerCase() === userRole);
        if (!hasAccess) {
          router.push('/dashboard'); // Redirect to dashboard if wrong role
        }
      }
    }, [user, loading, router]);

    // Show loading state while checking authentication
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      );
    }

    // Don't render component until authenticated
    if (!user) {
      return null;
    }

    // Check role requirement
    const allowedRoles = requireRoles || (requireRole ? [requireRole] : null);
    if (allowedRoles && allowedRoles.length > 0) {
      const userRole = user.role?.toLowerCase();
      const hasAccess = allowedRoles.some(role => role.toLowerCase() === userRole);
      if (!hasAccess) {
        return null;
      }
    }

    // Render the protected component
    return <Component {...props} />;
  };
}

// Convenience exports for specific roles
export function withAdminAuth(Component) {
  return withAuth(Component, { requireRole: 'admin' });
}

// Allow admin or librarian to view (librarians can view but not edit)
export function withAdminOrLibrarianAuth(Component) {
  return withAuth(Component, { requireRoles: ['admin', 'librarian'] });
}

export function withMemberAuth(Component) {
  return withAuth(Component, { requireRole: 'member' });
}

// Default export for convenience
export default withAuth;
