import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { withAdminAuth } from '../src/components/withAuth';

function Admin() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await axios.get('/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const user = response.data;
        const isAdmin = user.groups.some(group => group.name === 'Admin');
        if (!isAdmin) {
          router.push('/');
        } else {
          setUser(user);
        }
      } catch (err) {
        router.push('/login');
      }
    };

    fetchUser();
  }, [router]);

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Welcome, {user.email}</p>
      {/* Add admin functionality here */}
    </div>
  );
}

export default withAdminAuth(Admin);
