import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabase: SupabaseClient | null = null;
  private isConfigured = false;
  private healthCheckCompleted = false;
  private healthCheckFailed = false;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('NEXT_PUBLIC_SUPABASE_URL') || this.configService.get<string>('SUPABASE_URL');
    // Prefer service role key for backend operations (bypasses RLS), fallback to anon key
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || 
                        this.configService.get<string>('NEXT_PUBLIC_SUPABASE_ANON_KEY') || 
                        this.configService.get<string>('SUPABASE_KEY');
    
    if (supabaseUrl && supabaseKey) {
      try {
        // Supabase client - proxy is handled at Docker/network level via HTTP_PROXY/HTTPS_PROXY env vars
        // Node.js fetch will automatically use these environment variables if set
        // Create custom fetch with better error handling, proxy support, and SSL certificate handling
        const customFetch = async (url: string | URL | Request, options: RequestInit = {}): Promise<Response> => {
          const urlString = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
          try {
            // Use longer timeout for health check, shorter for regular requests
            const timeout = this.healthCheckCompleted ? 50000 : 100000;
            
            const urlObj = new URL(urlString);
            
            // Use https module for better SSL control (handles certificate issues)
            if (urlObj.protocol === 'https:') {
              const https = require('https');
              
              return new Promise((resolve, reject) => {
                // Get headers from options, convert Headers object to plain object if needed
                let requestHeaders: any = {};
                
                if (options.headers) {
                  if (options.headers instanceof Headers) {
                    options.headers.forEach((value, key) => {
                      requestHeaders[key] = value;
                    });
                  } else {
                    requestHeaders = { ...(options.headers as any) };
                  }
                }
                
                // Always add apikey header from config (Supabase client might not pass it through)
                // Prefer service role key (bypasses RLS), fallback to anon key
                const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
                                   this.configService.get<string>('NEXT_PUBLIC_SUPABASE_ANON_KEY') || 
                                   this.configService.get<string>('SUPABASE_KEY');
                if (supabaseKey && !requestHeaders.apikey && !requestHeaders.Authorization) {
                  requestHeaders.apikey = supabaseKey;
                }
                
                // Also add Authorization header if present in options but convert to apikey
                if (options.headers && typeof options.headers === 'object' && !(options.headers instanceof Headers)) {
                  const headers = options.headers as any;
                  if (headers.Authorization && headers.Authorization.startsWith('Bearer ')) {
                    // Supabase uses apikey, not Authorization for REST API
                    requestHeaders.apikey = supabaseKey;
                  }
                }
                
                // Only log if apikey is missing (warning case)
                // Don't log on every request to reduce noise
                if (!requestHeaders.apikey && !requestHeaders.Authorization) {
                  if (supabaseKey) {
                    requestHeaders.apikey = supabaseKey;
                    // Only log warning if we had to add it
                    console.warn('⚠️  No apikey header found! Added apikey from config');
                  } else {
                    console.warn('⚠️  No apikey header found and no configured key available!');
                  }
                }
                
                const httpsOptions: any = {
                  hostname: urlObj.hostname,
                  port: urlObj.port || 443,
                  path: urlObj.pathname + urlObj.search,
                  method: options.method || 'GET',
                  headers: requestHeaders,
                  rejectUnauthorized: true, // Try strict first
                };

                const makeRequest = (relaxed = false) => {
                  if (relaxed) {
                    httpsOptions.rejectUnauthorized = false;
                  }

                  const req = https.request(httpsOptions, (res: any) => {
                    const chunks: Buffer[] = [];
                    res.on('data', (chunk: Buffer) => chunks.push(chunk));
                    res.on('end', () => {
                      const body = Buffer.concat(chunks);
                      // Create a Response-like object that matches fetch API
                      const responseObj = {
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        status: res.statusCode,
                        statusText: res.statusMessage,
                        headers: new Headers(res.headers as any),
                        json: async () => JSON.parse(body.toString()),
                        text: async () => body.toString(),
                        arrayBuffer: async () => body.buffer,
                        url: url,
                        redirected: false,
                        type: 'default' as ResponseType,
                        clone: function() { return this; },
                        body: null,
                        bodyUsed: false,
                      };
                      resolve(responseObj as unknown as Response);
                    });
                  });

                  req.on('error', (err: any) => {
                    // If SSL error and not already relaxed, retry with relaxed validation
                    if (!relaxed && (err.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' || 
                        err.code === 'CERT_UNTRUSTED' ||
                        err.message?.includes('certificate'))) {
                      makeRequest(true); // Retry with relaxed SSL
                    } else {
                      reject(err);
                    }
                  });

                  req.setTimeout(timeout, () => {
                    req.destroy();
                    reject(new Error('TIMEOUT_ERROR'));
                  });

                  if (options.body) {
                    req.write(options.body);
                  }
                  req.end();
                };

                makeRequest();
              });
            } else {
              // HTTP requests use regular fetch
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), timeout);
              
              try {
                const response = await fetch(url, {
                  ...options,
                  signal: controller.signal,
                });
                clearTimeout(timeoutId);
                return response;
              } catch (fetchError: any) {
                clearTimeout(timeoutId);
                throw fetchError;
              }
            }
          } catch (error: any) {
            // Check if it's a timeout error
            if (error.message === 'TIMEOUT_ERROR' || error.name === 'TimeoutError' || 
                error.name === 'AbortError' || error.message?.includes('timeout') || 
                error.message?.includes('aborted')) {
              throw new Error('TIMEOUT_ERROR');
            }
            // Check if it's a DNS/network error
            if (error.code === 'EAI_AGAIN' || error.code === 'ENOTFOUND' || 
                error.message?.includes('getaddrinfo') || error.message?.includes('EAI_AGAIN')) {
              throw new Error('DNS_RESOLUTION_FAILED');
            }
            throw error;
          }
        };

        this.supabase = createClient(supabaseUrl, supabaseKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
          global: {
            fetch: customFetch,
          },
        });
        this.isConfigured = true;
        console.log('✅ Supabase client created (will verify connectivity at startup)');
      } catch (error) {
        console.error('❌ Failed to initialize Supabase client:', error);
        this.isConfigured = false;
      }
    } else {
      console.warn('⚠️  Supabase credentials not configured. Will use SQLite fallback.');
      this.isConfigured = false;
    }
  }

  getClient(): SupabaseClient {
    if (!this.supabase) {
      console.error('❌ Supabase client not available. Status:', {
        configured: this.isConfigured,
        healthCheckCompleted: this.healthCheckCompleted,
        healthCheckFailed: this.healthCheckFailed,
      });
      throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_KEY environment variables.');
    }
    
    if (!this.isReady()) {
      console.warn('⚠️  Using Supabase client but health check indicates it may not be ready');
    }
    
    return this.supabase;
  }

  async onModuleInit() {
    // Perform one-time health check at startup
    if (!this.isConfigured) {
      this.healthCheckCompleted = true;
      return;
    }

    console.log('🔍 Performing Supabase health check...');
    
    try {
      // Use Supabase REST API health endpoint or auth endpoint to verify connectivity
      const supabaseUrl = this.configService.get<string>('NEXT_PUBLIC_SUPABASE_URL') || 
                          this.configService.get<string>('SUPABASE_URL');
      
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
      }

      const urlObj = new URL(supabaseUrl);
      const hostname = urlObj.hostname;
      
      // Try hitting the REST API endpoint to verify connectivity
      // Use domain name - Docker's /etc/hosts will be used automatically if DNS fails
      // Using IP directly causes SSL certificate issues, so we use domain and let system resolve
      const healthCheckUrl = `${supabaseUrl}/rest/v1/`;
      
      // Create abort controller for timeout (10 seconds - increased for slow networks)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      // Use https module directly for better SSL control
      // Node.js fetch may have SSL certificate issues in some Docker environments
      const https = require('https');
      const url = require('url');
      
      const urlParsed = new URL(healthCheckUrl);
      const response = await new Promise<any>((resolve, reject) => {
        const options = {
          hostname: urlParsed.hostname,
          port: 443,
          path: urlParsed.pathname,
          method: 'GET',
          headers: {
            'apikey': this.configService.get<string>('NEXT_PUBLIC_SUPABASE_ANON_KEY') || 
                      this.configService.get<string>('SUPABASE_KEY') || '',
          },
          // Handle SSL certificate issues (common in corporate networks)
          rejectUnauthorized: true,
          // Use system CA certificates
          ca: undefined, // Use default system CAs
        };

        const req = https.request(options, (res) => {
          // Any response means connection works
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
          });
        });

        req.on('error', (err: any) => {
          // If SSL error, try with relaxed validation (for corporate proxies)
          if (err.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' || 
              err.code === 'CERT_UNTRUSTED' ||
              err.message?.includes('certificate')) {
            console.warn('⚠️  SSL certificate validation failed, trying with relaxed validation...');
            const relaxedOptions = { ...options, rejectUnauthorized: false };
            const relaxedReq = https.request(relaxedOptions, (res) => {
              resolve({
                ok: res.statusCode >= 200 && res.statusCode < 300,
                status: res.statusCode,
              });
            });
            relaxedReq.on('error', reject);
            relaxedReq.setTimeout(10000, () => {
              relaxedReq.destroy();
              reject(new Error('TIMEOUT_ERROR'));
            });
            relaxedReq.end();
          } else {
            reject(err);
          }
        });

        req.setTimeout(10000, () => {
          req.destroy();
          reject(new Error('TIMEOUT_ERROR'));
        });

        req.end();
      });
      
      clearTimeout(timeoutId);
      
      // If we get any response (even 404), connection is working
      if (response.ok || response.status === 404 || response.status === 401) {
        this.healthCheckCompleted = true;
        this.healthCheckFailed = false;
        console.log('✅ Supabase health check passed - connection is working');
        
        // Check tables after successful health check
        try {
          const { logSupabaseTableStatus } = require('./supabase-table-checker');
          await logSupabaseTableStatus(this.supabase!);
        } catch (checkError) {
          console.warn('⚠️  Could not check Supabase tables:', checkError);
        }
        
        return;
      }
      
      // Non-2xx response still means connection works
      this.healthCheckCompleted = true;
      this.healthCheckFailed = false;
      console.log('✅ Supabase health check passed - connection is working');
      
      // Check tables after successful health check
      try {
        const { logSupabaseTableStatus } = require('./supabase-table-checker');
        await logSupabaseTableStatus(this.supabase!);
      } catch (checkError) {
        console.warn('⚠️  Could not check Supabase tables:', checkError);
      }
    } catch (error: any) {
      // Health check failed - Supabase is not accessible
      this.healthCheckCompleted = true;
      this.healthCheckFailed = true;
      this.isConfigured = false; // Mark as unavailable
      
      // Log detailed error for debugging
      const errorDetails = {
        message: error.message,
        name: error.name,
        code: error.code,
        cause: error.cause?.message,
      };
      console.error('❌ Supabase health check failed');
      console.error('   Error details:', JSON.stringify(errorDetails, null, 2));
      
      if (error.message === 'DNS_RESOLUTION_FAILED' || error.message?.includes('getaddrinfo') || 
          error.code === 'EAI_AGAIN' || error.code === 'ENOTFOUND' || 
          error.message?.includes('EAI_AGAIN') || error.message?.includes('NXDOMAIN')) {
        console.error('❌ Supabase health check failed: DNS resolution error');
        console.error('💡 Solutions:');
        console.error('   1. Check network connectivity');
        console.error('   2. Configure proxy: Set HTTP_PROXY and HTTPS_PROXY in .env');
        console.error('   3. Docker DNS configured, but may need VPN DNS bypass');
        console.error('   4. Set AUTH_STORAGE=sqlite to use SQLite only');
      } else if (error.message === 'TIMEOUT_ERROR' || error.message?.includes('timeout') ||
                 error.message === 'Health check timeout' || error.name === 'TimeoutError' ||
                 error.name === 'AbortError') {
        console.error('❌ Supabase health check failed: Connection timeout (10s)');
        console.error('💡 Solutions:');
        console.error('   1. Check firewall/proxy settings');
        console.error('   2. Verify Supabase URL is correct');
        console.error('   3. Check if Supabase project is paused (free tier)');
        console.error('   4. Configure HTTP_PROXY/HTTPS_PROXY if behind corporate proxy');
        console.error('   5. Set AUTH_STORAGE=sqlite to use SQLite only');
      } else if (error.message?.includes('fetch failed') || error.message?.includes('ECONNREFUSED') ||
                 error.message?.includes('ENOTFOUND') || error.message?.includes('network')) {
        console.error('❌ Supabase health check failed: Network error');
        console.error('💡 This usually means:');
        console.error('   1. DNS cannot resolve the domain');
        console.error('   2. Firewall is blocking HTTPS to Supabase');
        console.error('   3. Corporate proxy required (set HTTP_PROXY/HTTPS_PROXY)');
        console.error('   4. Set AUTH_STORAGE=sqlite to use SQLite only');
      } else {
        console.error('❌ Supabase health check failed:', error.message);
        console.error('💡 Set AUTH_STORAGE=sqlite to use SQLite only');
      }
      console.warn('⚠️  Switching to SQLite mode for this session');
      console.warn('⚠️  Restart the server after fixing network/proxy issues to re-enable Supabase');
    }
  }

  isReady(): boolean {
    // Only ready if configured AND health check passed
    const ready = this.isConfigured && this.healthCheckCompleted && !this.healthCheckFailed;
    
    // Log detailed status for debugging
    if (!ready && this.isConfigured) {
      console.log('📊 Supabase Status:', {
        configured: this.isConfigured,
        healthCheckCompleted: this.healthCheckCompleted,
        healthCheckFailed: this.healthCheckFailed,
        ready,
      });
    }
    
    return ready;
  }

  getHealthCheckStatus(): { completed: boolean; failed: boolean; configured: boolean } {
    return {
      completed: this.healthCheckCompleted,
      failed: this.healthCheckFailed,
      configured: this.isConfigured,
    };
  }
}
