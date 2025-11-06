import Link from 'next/link';

export default function Help() {
  const features = [
    {
      icon: (
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: 'Getting Started',
      gradient: 'from-blue-500 to-indigo-600',
      items: [
        { step: '1', text: 'Register an Account', desc: 'Click "Register" to create your free account' },
        { step: '2', text: 'Choose Your Plan', desc: 'Select from Free, Bronze, Silver, or Gold membership' },
        { step: '3', text: 'Browse Books', desc: 'Explore our extensive catalog of books' },
        { step: '4', text: 'Borrow & Enjoy', desc: 'Start borrowing books instantly' },
      ]
    },
    {
      icon: (
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Membership Plans',
      gradient: 'from-purple-500 to-pink-600',
      items: [
        { plan: 'Free', title: 'Free Trial - 1 Week', price: '', concurrent: '1 book', max: 'Max 2 books', color: 'text-gray-600' },
        { plan: 'Bronze', title: 'Bronze - ₹299/month', price: '', concurrent: '1 book', max: 'Max 5 books', color: 'text-amber-600' },
        { plan: 'Silver', title: 'Silver - ₹599/month', price: '', concurrent: '2 books', max: 'Max 10 books', color: 'text-gray-400' },
        { plan: 'Gold', title: 'Gold - ₹999/month', price: '', concurrent: '2 books', max: 'Max 20 books', color: 'text-yellow-500' },
      ]
    },
    {
      icon: (
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      title: 'How to Borrow Books',
      gradient: 'from-green-500 to-teal-600',
      items: [
        { num: '1', text: 'Sign in to your account' },
        { num: '2', text: 'Browse or search for books' },
        { num: '3', text: 'Click "Borrow" on available books' },
        { num: '4', text: 'View transactions in your dashboard' },
        { num: '5', text: 'Return books before due date' },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="relative bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-primary-600 rounded-full blur group-hover:blur-md transition-all"></div>
                <svg className="relative h-12 w-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                Library Management System
              </h1>
            </Link>
            <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  className="relative inline-flex items-center px-6 py-3 overflow-hidden text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-purple-600 rounded-full group hover:from-primary-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <span className="relative z-10">Sign In</span>
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-purple-600 to-primary-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>
                <Link
                  href="/register"
                  className="relative inline-flex items-center px-6 py-3 overflow-hidden text-sm font-medium text-primary-600 bg-white rounded-full group hover:bg-gray-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 border-2 border-primary-600"
                >
                  <span className="relative z-10">Register</span>
                </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        <div className="text-center">
          <div className="inline-block animate-bounce-slow mb-6">
            <div className="bg-gradient-to-r from-primary-500 to-purple-600 p-4 rounded-2xl shadow-2xl">
              <svg className="h-16 w-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h2 className="text-5xl md:text-6xl font-extrabold mb-6">
            <span className="bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              How Can We Help You?
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto">
            Everything you need to know about using our amazing library system
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Getting Started Card */}
          <div className="group bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2">
            <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
            <div className="p-8">
              <div className="flex items-center mb-6">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  {features[0].icon}
                </div>
                <h3 className="ml-4 text-2xl font-bold text-gray-900">{features[0].title}</h3>
              </div>
              <div className="space-y-4">
                {features[0].items.map((item, idx) => (
                  <div key={idx} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-blue-50 transition-colors duration-200">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md">
                      {item.step}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{item.text}</p>
                      <p className="text-sm text-gray-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Membership Plans Card */}
          <div className="group bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2">
            <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-600"></div>
            <div className="p-8">
              <div className="flex items-center mb-6">
                <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  {features[1].icon}
                </div>
                <h3 className="ml-4 text-2xl font-bold text-gray-900">{features[1].title}</h3>
              </div>
              <div className="space-y-4">
                {features[1].items.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-gradient-to-r from-gray-50 to-purple-50 hover:from-purple-50 hover:to-pink-50 transition-all duration-200 border border-gray-200 hover:border-purple-300">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className={`text-xl font-bold ${item.color}`}>{item.title || item.plan}</p>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs text-gray-600">
                      <p>• {item.concurrent} per reservation, {item.max}</p>
                      {/* <p>• {item.max}</p> */}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* How to Borrow Card */}
          <div className="group bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2">
            <div className="h-2 bg-gradient-to-r from-green-500 to-teal-600"></div>
            <div className="p-8">
              <div className="flex items-center mb-6">
                <div className="bg-gradient-to-r from-green-500 to-teal-600 text-white p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  {features[2].icon}
                </div>
                <h3 className="ml-4 text-2xl font-bold text-gray-900">{features[2].title}</h3>
              </div>
              <div className="space-y-3">
                {features[2].items.map((item, idx) => (
                  <div key={idx} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-green-50 transition-colors duration-200">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md">
                      {item.num}
                    </div>
                    <p className="text-gray-700 font-medium">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Demo Accounts Section */}
        <div className="mt-12 bg-gradient-to-r from-primary-500 via-purple-600 to-pink-600 rounded-2xl shadow-2xl overflow-hidden transform hover:scale-[1.02] transition-transform duration-300">
          <div className="p-8 md:p-12 text-white">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-white/20 backdrop-blur-md p-4 rounded-xl">
                <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-3xl md:text-4xl font-extrabold text-center mb-8">Getting Started</h3>
            <div className="max-w-2xl mx-auto">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300">
                <div className="flex items-center mb-4">
                  <div className="bg-green-400 rounded-full p-2 mr-3">
                    <svg className="h-6 w-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <p className="text-xl font-bold">Create Your Account</p>
                </div>
                <p className="text-lg mb-4">
                  To get started with the Library Management System, simply register a new account by clicking the "Register" button on the home page.
                </p>
                <p className="text-lg">
                  After registration, you can log in and start browsing and borrowing books from our catalog.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Users Section - Only shown when SQLite is used */}
        <div className="mt-12 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-xl p-8 border-2 border-indigo-200">
          <div className="text-center mb-6">
            <div className="inline-block bg-indigo-600 text-white p-4 rounded-xl mb-4">
              <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Demo Accounts (SQLite Mode)</h3>
            <p className="text-gray-600 mb-6">
              Use these pre-seeded accounts to explore different user roles
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Admin Account */}
            <div className="bg-white rounded-xl shadow-md p-6 border-2 border-purple-200">
              <div className="flex items-center mb-4">
                <div className="bg-purple-100 p-3 rounded-lg mr-3">
                  <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-gray-900">Admin</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-purple-700 font-mono">demo_admin@library.com</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Password:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-gray-700 font-mono">password</code>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Full system access including user and group management
                  </p>
                </div>
              </div>
            </div>

            {/* Librarian Account */}
            <div className="bg-white rounded-xl shadow-md p-6 border-2 border-blue-200">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 p-3 rounded-lg mr-3">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-gray-900">Librarian</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-blue-700 font-mono">demo_librarian@library.com</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Password:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-gray-700 font-mono">password</code>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    View-only access to users and groups, can manage books
                  </p>
                </div>
              </div>
            </div>

            {/* Member Account */}
            <div className="bg-white rounded-xl shadow-md p-6 border-2 border-green-200">
              <div className="flex items-center mb-4">
                <div className="bg-green-100 p-3 rounded-lg mr-3">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-gray-900">Member</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-green-700 font-mono">demo_member@library.com</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Password:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-gray-700 font-mono">password</code>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Standard user with book borrowing capabilities
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> These demo accounts are only available when using SQLite database mode. 
              If you're using Supabase, you'll need to create your own accounts through the registration process.
            </p>
          </div>
        </div>

        {/* Contact Section */}
        <div className="mt-12 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center">
          <div className="inline-block bg-gradient-to-r from-primary-500 to-purple-600 text-white p-4 rounded-xl mb-4">
            <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Need More Help?</h3>
          <p className="text-lg text-gray-700 mb-6">
            Our support team is here to assist you
          </p>
          <a
            href="mailto:support@library.com"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-primary-600 to-purple-600 text-white text-lg font-semibold rounded-full hover:from-primary-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <svg className="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            support@library.com
          </a>
        </div>

        {/* Back Button */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center px-8 py-4 bg-white text-primary-600 text-lg font-semibold rounded-full hover:bg-gray-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 border-2 border-primary-600"
          >
            <svg className="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <p className="text-gray-400 text-lg">© 2025 Library Management System. All rights reserved.</p>
            <p className="text-gray-500 mt-2">Made with ❤️ for book lovers</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animate-bounce-slow {
          animation: bounce 3s infinite;
        }
      `}</style>
    </div>
  );
}
