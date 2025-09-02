# Vercel Deployment Instructions

## Repository Information
- **GitHub Repository**: https://github.com/Boharrisonabrams/happy-mahjong-local
- **Branch**: main (ready for deployment)
- **Configuration**: vercel.json included

## Quick Deploy to Vercel

### Option 1: Deploy Button (Easiest)
Click this button to deploy directly to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Boharrisonabrams/happy-mahjong-local)

### Option 2: Manual Deployment
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project" 
3. Import from Git: `https://github.com/Boharrisonabrams/happy-mahjong-local`
4. Configure environment variables (see below)
5. Deploy

## Required Environment Variables for Production

⚠️ **CRITICAL**: These must be configured in Vercel dashboard before deployment:

```env
# Database (REQUIRED)
DATABASE_URL=your-production-neon-database-url

# Session Security (REQUIRED) 
SESSION_SECRET=your-secure-64-character-session-secret

# Production Settings
NODE_ENV=production
LOCAL_DEV_MODE=false

# Authentication (if using Replit auth)
REPLIT_DOMAINS=your-app-name.vercel.app
ISSUER_URL=https://replit.com/oidc  
REPL_ID=your-repl-id

# Features
ANALYTICS_ENABLED=true
BILLING_ENABLED=false
```

## Post-Deployment Steps

1. **Configure Database**: Update DATABASE_URL with production Neon/PostgreSQL URL
2. **Run Migrations**: Use Vercel dashboard or CLI to run `npm run db:push`
3. **Test Authentication**: Verify login system works in production
4. **Update DNS**: Configure custom domain if needed

## Database Options

### Option 1: Neon (Recommended)
- Use existing Neon database from original Replit project
- Or create new Neon database for production

### Option 2: Supabase
- Create free Supabase project
- Use PostgreSQL connection string

### Option 3: PlanetScale
- Create PlanetScale database
- Update schema for MySQL compatibility if needed

## Architecture Notes

- **Frontend**: Vite-built React app served as static files
- **Backend**: Node.js serverless functions  
- **Database**: PostgreSQL (Neon/Supabase recommended)
- **File Storage**: Currently local (upgrade to cloud storage for production)
- **Authentication**: Local demo users (upgrade for production)

## Support

Repository includes comprehensive documentation:
- `LOCAL_SETUP.md` - Development setup
- `TEST_RESULTS.md` - Current functionality status  
- `SETUP_STATUS.md` - Migration completion status