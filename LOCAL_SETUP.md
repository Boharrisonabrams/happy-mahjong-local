# Local Development Setup Guide

## Prerequisites

1. **Node.js 18+** - Download from [nodejs.org](https://nodejs.org/)
2. **PostgreSQL** - Either local install or continue using Neon (recommended for now)
3. **Git** - For version control

## Quick Start

### 1. Environment Setup

```bash
# Copy the local environment template
cp .env.local .env

# Edit .env with your actual values
```

### 2. Database Setup Options

**Option A: Continue using Neon (Recommended)**
- Keep your existing `DATABASE_URL` from Replit
- Works seamlessly with local development
- No additional setup required

**Option B: Local PostgreSQL**
```bash
# Install PostgreSQL locally
# Update DATABASE_URL in .env to:
# DATABASE_URL=postgresql://username:password@localhost:5432/mahjong_local
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Database Migrations

```bash
# Push database schema
npm run db:push
```

### 5. Start Development

```bash
# Start both client and server
npm run dev

# Or run separately:
npm run dev:server  # Backend on port 5000
npm run dev:client  # Frontend on port 5173
```

## Environment Variables Explained

| Variable | Purpose | Local Value |
|----------|---------|-------------|
| `DATABASE_URL` | PostgreSQL connection | Your Neon URL or local DB |
| `SESSION_SECRET` | Session encryption | Generate a secure 32+ char string |
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |
| `LOCAL_DEV_MODE` | Local development flag | `true` |
| `DISABLE_REPLIT_AUTH` | Skip Replit auth | `true` |

## What's Different from Replit

### Authentication
- **Replit**: Uses OpenID Connect with Replit
- **Local**: Temporarily disabled, will implement local auth

### File Storage
- **Replit**: Google Cloud Storage via sidecar
- **Local**: Local file system (uploads folder)

### Development Tools
- **Replit**: Custom Vite plugins for debugging
- **Local**: Standard Vite development server

## Common Issues & Solutions

### Issue: Database Connection Error
```
Error: DATABASE_URL must be set
```
**Solution**: Ensure your `.env` file has a valid `DATABASE_URL`

### Issue: Session Secret Error
```
Error: Environment variable SESSION_SECRET not provided
```
**Solution**: Generate a secure session secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Issue: Port Already in Use
```
Error: Port 5000 is already in use
```
**Solution**: Change PORT in `.env` or stop other services using port 5000

## Development Workflow

1. **Make changes** in the `local-development` branch
2. **Test locally** using `npm run dev`
3. **Never push to main** without explicit approval
4. **Keep backups** of your working state

## Next Steps

After basic setup works:
1. Replace Replit authentication with local auth system
2. Set up local file storage handling
3. Remove Replit-specific dependencies
4. Add local development documentation

## Troubleshooting

If you encounter issues:
1. Check the console for error messages
2. Verify all environment variables are set
3. Ensure database is accessible
4. Check that all ports are available

## Safe Development Practices

- Always work in `local-development` branch
- Keep regular backups of working state  
- Test thoroughly before any commits
- Document any changes for your client