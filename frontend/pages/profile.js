import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    notificationPreferences: {
      email: false,
      sms: false,
    },
  });
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await axios.get('http://localhost:3001/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(response.data);
        setFormData(response.data);
      } catch (err) {
        router.push('/login');
      }
    };

    fetchUser();
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        [name]: checked,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      await axios.put('http://localhost:3001/profile', formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Profile updated successfully');
    } catch (err) {
      alert('Failed to update profile');
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Profile</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>First Name</label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Last Name</label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            disabled
          />
        </div>
        <div>
          <h2>Notification Preferences</h2>
          <label>
            <input
              type="checkbox"
              name="email"
              checked={formData.notificationPreferences.email}
              onChange={handleCheckboxChange}
            />
            Email
          </label>
          <label>
            <input
              type="checkbox"
              name="sms"
              checked={formData.notificationPreferences.sms}
              onChange={handleCheckboxChange}
            />
            SMS
          </label>
        </div>
        <button type="submit">Update Profile</button>
      </form>
    </div>
  );
}
