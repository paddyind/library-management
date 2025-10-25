import Layout from '../src/components/layout/Layout';

export default function NotificationsPage() {
  return (
    <Layout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">My Notifications</h1>
          {/* Notifications list will go here */}
        </div>
      </div>
    </Layout>
  );
}
