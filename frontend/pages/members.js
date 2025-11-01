import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Layout from '../src/components/layout/Layout.js';

/**
 * Members page - Redirects to Users page
 * This page is kept for backward compatibility but redirects to /users
 */
function MembersPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to users page
    router.replace('/users');
  }, [router]);

  return (
    <Layout>
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    </Layout>
  );
}

export default MembersPage;
