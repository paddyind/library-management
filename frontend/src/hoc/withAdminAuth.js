import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';

const withAdminAuth = (WrappedComponent) => {
  return (props) => {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && (!user || user.role !== 'Admin')) {
        router.push('/');
      }
    }, [user, loading, router]);

    if (loading || !user || user.role !== 'Admin') {
      return <div>Loading...</div>;
    }

    return <WrappedComponent {...props} />;
  };
};

export default withAdminAuth;
