import { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Sidebar component with smooth transition */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content - add left margin on desktop to account for fixed sidebar */}
      <div className="flex flex-col flex-1 overflow-hidden md:ml-64">
        <Header onMenuButtonClick={() => setSidebarOpen(true)} />

        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <div className="py-6 transition-all duration-200 ease-in-out">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
              {/* Page header area */}
              <div className="md:flex md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                    Library Management System
                  </h2>
                </div>
              </div>

              {/* Main content area with card styling */}
              <div className="bg-white rounded-lg shadow-float px-5 py-6 sm:px-6">
                <div className="h-full">{children}</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;
