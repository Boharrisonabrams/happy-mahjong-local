import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { randomBytes, pbkdf2Sync } from "crypto";

// Simple local authentication for development
// In production, you'd want proper password hashing, email verification, etc.

const DEMO_USERS = [
  {
    id: "demo-user-1",
    email: "demo@mahjong.local",
    password: "demo123",
    firstName: "Demo",
    lastName: "User",
    profileImageUrl: null,
  },
  {
    id: "demo-user-2", 
    email: "player2@mahjong.local",
    password: "demo123",
    firstName: "Player",
    lastName: "Two",
    profileImageUrl: null,
  }
];

function hashPassword(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const hashToVerify = hashPassword(password, salt);
  return hash === hashToVerify;
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

async function findUser(email: string) {
  // In development, use demo users
  return DEMO_USERS.find(user => user.email === email);
}

async function upsertUser(userData: any) {
  await storage.upsertUser({
    id: userData.id,
    email: userData.email,
    firstName: userData.firstName,
    lastName: userData.lastName,
    profileImageUrl: userData.profileImageUrl,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Local strategy for development
  passport.use(new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    async (email, password, done) => {
      try {
        const user = await findUser(email);
        if (!user) {
          return done(null, false, { message: 'User not found' });
        }

        // Simple password check for demo
        if (user.password !== password) {
          return done(null, false, { message: 'Invalid password' });
        }

        // Upsert user in database
        await upsertUser(user);
        
        return done(null, {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
        });
      } catch (error) {
        return done(error);
      }
    }
  ));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = DEMO_USERS.find(u => u.id === id);
      if (user) {
        done(null, {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
        });
      } else {
        done(null, false);
      }
    } catch (error) {
      done(error);
    }
  });

  // Local auth routes
  app.post("/api/login", passport.authenticate('local'), (req, res) => {
    res.json({ success: true, user: req.user });
  });

  // Simple login page endpoint
  app.get("/api/login", (req, res) => {
    res.json({ 
      message: "Local development login",
      demoUsers: [
        { email: "demo@mahjong.local", password: "demo123" },
        { email: "player2@mahjong.local", password: "demo123" }
      ]
    });
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // User info endpoint
  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      res.json({ user: req.user });
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (process.env.LOCAL_DEV_MODE === "true" && process.env.DISABLE_REPLIT_AUTH === "true") {
    // In local development mode, allow bypassing auth for testing
    if (!req.isAuthenticated()) {
      // Auto-login as demo user for development
      req.login(DEMO_USERS[0], (err) => {
        if (err) return next(err);
        return next();
      });
    } else {
      return next();
    }
  } else {
    if (req.isAuthenticated()) {
      return next();
    } else {
      return res.status(401).json({ message: "Authentication required" });
    }
  }
};