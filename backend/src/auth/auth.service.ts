import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../config/supabase.service';
import { SqliteService } from '../config/sqlite.service';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
import * as jwt from 'jsonwebtoken';
import { MemberRole } from '../members/member.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly sqliteService: SqliteService,
    private readonly configService: ConfigService,
  ) {}

  private getPreferredStorage(): 'supabase' | 'sqlite' {
    const storagePreference = this.configService.get<string>('AUTH_STORAGE', 'auto').toLowerCase();
    
    // Force SQLite if explicitly configured
    if (storagePreference === 'sqlite') {
      return 'sqlite';
    }
    
    // Force Supabase if explicitly configured (even if health check failed)
    if (storagePreference === 'supabase') {
      return 'supabase';
    }
    
    // Auto mode (default): Use Supabase ONLY if health check passed at startup
    // Once health check is done, stick with the decision for the session
    if (this.supabaseService.isReady()) {
      return 'supabase';
    }
    
    // Default to SQLite if Supabase health check failed or not configured
    return 'sqlite';
  }

  async signUp(signUpDto: SignUpDto) {
    const { email, password, name, phone, dateOfBirth, address, preferences } = signUpDto;
    const storage = this.getPreferredStorage();
    
    // Check if both databases are available
    const supabaseAvailable = this.supabaseService.isReady();
    const sqliteAvailable = this.sqliteService.isReady();
    const syncToBoth = supabaseAvailable && sqliteAvailable;
    
    let primaryResult: any = null;
    let primaryStorage: 'supabase' | 'sqlite' = storage;
    
    // Try Supabase first if preferred (health check passed at startup)
    if (storage === 'supabase' && supabaseAvailable) {
      try {
        const { data, error } = await this.supabaseService.getClient().auth.signUp({
          email,
          password,
        });

        if (error) {
          console.warn('⚠️ Supabase signup error, falling back to SQLite:', error.message);
          primaryStorage = 'sqlite';
        } else {
          console.log('✅ Supabase registration successful for:', email);
          
          // Create user profile in users table with all fields
          if (data.user?.id) {
            await this.supabaseService.getClient()
              .from('users')
              .insert({
                id: data.user.id,
                email: data.user.email || email,
                name: name || email.split('@')[0],
                role: MemberRole.MEMBER,
                phone: phone || null,
                dateOfBirth: dateOfBirth || null,
                address: address || null,
                preferences: preferences || null,
              });
          }
          
          primaryResult = {
            id: data.user?.id || '',
            email: data.user?.email || email,
            name: name || email.split('@')[0],
            role: MemberRole.MEMBER,
          };
        }
      } catch (error: any) {
        console.warn('⚠️ Supabase connection failed, falling back to SQLite:', error.message);
        primaryStorage = 'sqlite';
      }
    }

    // If Supabase failed or SQLite is preferred, use SQLite
    if (!primaryResult && sqliteAvailable) {
      try {
        const newUser = this.sqliteService.createUser({
          email,
          password,
          name: name || email.split('@')[0],
          role: MemberRole.MEMBER,
          phone: phone || '',
          dateOfBirth: dateOfBirth || '',
          address: address || '',
          preferences: preferences || '',
        });
        
        primaryResult = {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role as MemberRole,
        };
        
        console.log('✅ SQLite registration successful for:', email);
      } catch (error: any) {
        throw new Error(`Failed to create user: ${error.message}`);
      }
    }
    
    if (!primaryResult) {
      throw new Error('No available database for user registration');
    }
    
    // Sync to secondary database if both are available
    if (syncToBoth && primaryResult) {
      try {
        if (primaryStorage === 'supabase' && sqliteAvailable) {
          // Also create in SQLite with Supabase ID
          try {
            const existingUser = this.sqliteService.findUserById(primaryResult.id);
            if (!existingUser) {
              // Check if user exists by email (might have different ID)
              const existingByEmail = this.sqliteService.findUserByEmail(email);
              if (existingByEmail) {
                // Update existing user's ID to match Supabase ID
                const db = (this.sqliteService as any).db;
                if (db) {
                  const stmt = db.prepare('UPDATE users SET id = ? WHERE email = ?');
                  stmt.run(primaryResult.id, email);
                  console.log('✅ Updated SQLite user ID to match Supabase');
                }
              } else {
                // Create new user in SQLite with Supabase ID
                const db = (this.sqliteService as any).db;
                if (db) {
                  const bcrypt = require('bcrypt');
                  const hashedPassword = bcrypt.hashSync(password, 10);
                  const now = new Date().toISOString();
                  
                  const stmt = db.prepare(`
                    INSERT INTO users (id, email, password, name, role, phone, dateOfBirth, address, preferences, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  `);
                  
                  stmt.run(
                    primaryResult.id,
                    email,
                    hashedPassword,
                    primaryResult.name,
                    primaryResult.role,
                    phone || '',
                    dateOfBirth || '',
                    address || '',
                    preferences || '',
                    now,
                    now
                  );
                  console.log('✅ User synced to SQLite with Supabase ID');
                }
              }
            }
          } catch (err: any) {
            console.warn('⚠️ Could not sync user to SQLite:', err.message);
          }
        } else if (primaryStorage === 'sqlite' && supabaseAvailable) {
          // Also create in Supabase
          try {
            const { data, error } = await this.supabaseService.getClient().auth.signUp({
              email,
              password,
            });
            
            if (!error && data.user) {
              // Also insert into users table
              await this.supabaseService.getClient()
                .from('users')
                .insert({
                  id: data.user.id,
                  email: primaryResult.email,
                  name: primaryResult.name,
                  role: primaryResult.role,
                  phone: phone || null,
                  dateOfBirth: dateOfBirth || null,
                  address: address || null,
                  preferences: preferences || null,
                });
              console.log('✅ User also created in Supabase for sync');
            }
          } catch (err: any) {
            console.warn('⚠️ Could not sync user to Supabase:', err.message);
          }
        }
      } catch (syncError: any) {
        // Don't fail registration if sync fails - log and continue
        console.warn('⚠️ Dual-write sync failed (user created in primary DB only):', syncError.message);
      }
    }
    
    // Generate JWT token
    const token = this.generateToken(primaryResult);

    return {
      access_token: token,
      user: primaryResult,
    };
  }

  private sqliteSignUp(signUpDto: SignUpDto) {
    const { email, password, name, phone, dateOfBirth, address, preferences } = signUpDto;
    
    if (!this.sqliteService.isReady()) {
      throw new Error('SQLite database is not available');
    }

    console.log('📝 SQLite registration:', email);
    
    try {
      // Check if user already exists
      const existingUser = this.sqliteService.findUserByEmail(email);
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Create new user in SQLite
      const newUser = this.sqliteService.createUser({
        email,
        password,
        name: name || email.split('@')[0],
        role: MemberRole.MEMBER,
        phone: phone || '',
        dateOfBirth: dateOfBirth || '',
        address: address || '',
        preferences: preferences || '',
      });

      // Generate JWT token
      const token = this.generateToken({
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role as MemberRole,
      });

      return {
        access_token: token,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
      };
    } catch (error: any) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  async signIn(signInDto: SignInDto) {
    const { email, password } = signInDto;
    const storage = this.getPreferredStorage();

    // Try Supabase first if preferred (health check passed at startup)
    if (storage === 'supabase') {
      let authData: any = null;
      try {
        const { data, error } = await this.supabaseService.getClient().auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.warn('⚠️ Supabase auth error, falling back to SQLite:', error.message);
          return this.sqliteSignIn(email, password);
        }

        authData = data;
        console.log('✅ Supabase authentication successful for:', email);
        
        // Fetch full user profile from users table to get complete user data
        let fullUserProfile: any = null;
        const authUser = data.user as any;
        const userId = authUser?.id || '';
        
        try {
          const { data: profileData, error: profileError } = await this.supabaseService
            .getClient()
            .from('users')
            .select('id, email, name, role, phone, dateOfBirth, address, preferences')
            .eq('id', userId)
            .maybeSingle();
          
          if (!profileError && profileData) {
            fullUserProfile = profileData;
            console.log('✅ Fetched full user profile:', profileData.email, profileData.name);
          } else {
            // User doesn't exist in users table - create them
            console.warn('⚠️ User not found in users table, creating profile...');
            try {
              const { data: newProfile, error: insertError } = await this.supabaseService
                .getClient()
                .from('users')
                .insert({
                  id: userId,
                  email: authUser?.email || email,
                  name: authUser?.user_metadata?.name || email.split('@')[0],
                  role: MemberRole.MEMBER,
                  phone: null,
                  dateOfBirth: null,
                  address: null,
                  preferences: null,
                })
                .select()
                .single();
              
              if (!insertError && newProfile) {
                fullUserProfile = newProfile;
                console.log('✅ Created user profile in users table');
              } else {
                console.warn('⚠️ Could not create user profile:', insertError?.message);
              }
            } catch (createError: any) {
              console.warn('⚠️ Error creating user profile:', createError.message);
            }
          }
        } catch (error: any) {
          console.warn('⚠️ Error fetching user profile:', error.message);
        }
        
        // Use profile data if available, otherwise fallback to auth metadata
        const userEmail = fullUserProfile?.email || authUser?.email || email;
        const userName = fullUserProfile?.name || authUser?.user_metadata?.name || email.split('@')[0];
        const userRole = fullUserProfile?.role || MemberRole.MEMBER;
        
        // ALWAYS sync user to SQLite if available (for fallback support)
        // This ensures SQLite has the user even if Supabase connection fails later
        if (this.sqliteService.isReady() && userId) {
          try {
            const existingUser = this.sqliteService.findUserById(userId);
            if (!existingUser) {
              // Check if user exists by email (might have different ID)
              const existingByEmail = this.sqliteService.findUserByEmail(userEmail);
              if (existingByEmail) {
                // Update existing user's ID to match Supabase ID
                const db = (this.sqliteService as any).db;
                if (db) {
                  const stmt = db.prepare('UPDATE users SET id = ? WHERE email = ?');
                  stmt.run(userId, userEmail);
                  console.log('✅ Updated SQLite user ID to match Supabase');
                }
              } else {
                // Create new user in SQLite with Supabase ID
                const db = (this.sqliteService as any).db;
                if (db) {
                  const bcrypt = require('bcrypt');
                  const hashedPassword = bcrypt.hashSync('SUPABASE_USER', 10); // Placeholder password
                  const now = new Date().toISOString();
                  
                  const stmt = db.prepare(`
                    INSERT INTO users (id, email, password, name, role, phone, dateOfBirth, address, preferences, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  `);
                  
                  stmt.run(
                    userId,
                    userEmail,
                    hashedPassword,
                    userName,
                    userRole,
                    fullUserProfile?.phone || '',
                    fullUserProfile?.dateOfBirth || '',
                    fullUserProfile?.address || '',
                    fullUserProfile?.preferences || '',
                    now,
                    now
                  );
                  console.log('✅ User synced to SQLite for fallback support');
                }
              }
            } else {
              console.log('✅ User already exists in SQLite');
            }
          } catch (syncError: any) {
            console.warn('⚠️ Could not sync user to SQLite:', syncError.message);
            // Don't fail login if SQLite sync fails, but log the warning
          }
        } else if (!this.sqliteService.isReady()) {
          console.warn('⚠️ SQLite not available - user will not be synced for fallback');
        }
        
        // Normalize role
        const roleLower = userRole?.toLowerCase();
        let normalizedRole: MemberRole;
        if (roleLower === 'admin') {
          normalizedRole = MemberRole.ADMIN;
        } else if (roleLower === 'librarian') {
          normalizedRole = MemberRole.LIBRARIAN;
        } else {
          normalizedRole = MemberRole.MEMBER;
        }

        // Generate JWT token from full user profile
        const token = this.generateToken({
          id: userId,
          email: userEmail,
          name: userName,
          role: normalizedRole,
        });

        return {
          access_token: token,
          user: {
            id: userId,
            email: userEmail,
            name: userName,
            role: userRole, // Return original role string, not normalized enum
          },
        };
      } catch (error: any) {
        // Check for DNS/network errors and fallback immediately
        if (error.message === 'DNS_RESOLUTION_FAILED' || 
            error.code === 'EAI_AGAIN' || 
            error.code === 'ENOTFOUND' ||
            error.message?.includes('getaddrinfo')) {
          console.warn('⚠️ Supabase DNS/network error detected, immediately falling back to SQLite');
        } else {
          console.warn('⚠️ Supabase connection failed, falling back to SQLite:', error.message);
        }
        
        // Before falling back, try to sync any existing Supabase user to SQLite if we have their ID
        // This handles cases where user authenticated with Supabase but connection failed during profile fetch
        if (authData?.user?.id && this.sqliteService.isReady()) {
          try {
            const existingUser = this.sqliteService.findUserById(authData.user.id);
            if (!existingUser) {
              const existingByEmail = this.sqliteService.findUserByEmail(email);
              if (!existingByEmail) {
                const db = (this.sqliteService as any).db;
                if (db) {
                  const bcrypt = require('bcrypt');
                  const hashedPassword = bcrypt.hashSync('SUPABASE_USER', 10);
                  const now = new Date().toISOString();
                  
                  const stmt = db.prepare(`
                    INSERT INTO users (id, email, password, name, role, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                  `);
                  
                  stmt.run(
                    authData.user.id,
                    email,
                    hashedPassword,
                    authData.user.user_metadata?.name || email.split('@')[0],
                    MemberRole.MEMBER,
                    now,
                    now
                  );
                  console.log('✅ Synced Supabase user to SQLite before fallback');
                }
              }
            }
          } catch (syncError: any) {
            console.warn('⚠️ Could not sync Supabase user to SQLite before fallback:', syncError.message);
          }
        }
        
        return this.sqliteSignIn(email, password);
      }
    }

    // Use SQLite authentication (either forced or as fallback)
    return this.sqliteSignIn(email, password);
  }

  private sqliteSignIn(email: string, password: string) {
    if (!this.sqliteService.isReady()) {
      throw new Error('SQLite database is not available');
    }

    console.log('🔐 SQLite login attempt:', email);
    
    const user = this.sqliteService.findUserByEmail(email);
    
    if (!user) {
      console.log('❌ User not found:', email);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = this.sqliteService.verifyPassword(password, user.password);
    
    if (!isPasswordValid) {
      console.log('❌ Password mismatch for:', email);
      throw new UnauthorizedException('Invalid email or password');
    }

    console.log('✅ Login successful for:', email);

    // Normalize role to match MemberRole enum
    const roleLower = user.role?.toLowerCase();
    let normalizedRole: MemberRole;
    if (roleLower === 'admin') {
      normalizedRole = MemberRole.ADMIN;
    } else if (roleLower === 'librarian') {
      normalizedRole = MemberRole.LIBRARIAN;
    } else {
      normalizedRole = MemberRole.MEMBER;
    }

    // Generate JWT token
    const token = this.generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: normalizedRole,
    });

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  private generateToken(user: any): string {
    const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    
    return jwt.sign(payload, secret, { expiresIn: '7d' });
  }
}
