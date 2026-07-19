import '../src/styles/globals.css';
import { useEffect } from 'react';
import { AuthProvider } from '../src/contexts/AuthContext';
import { hydrateLibraryRuntime } from '../src/lib/runtimeConfig';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    hydrateLibraryRuntime();
  }, []);

  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default MyApp;
