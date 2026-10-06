#!/bin/bash
echo "🚀 Starting HavenFinder services..."

# Start PostgreSQL
echo "  Starting PostgreSQL..."
pg_ctl -D $PREFIX/var/lib/postgresql -l /tmp/pg.log start 2>/dev/null || echo "  PostgreSQL already running"
sleep 2

# Start Redis
echo "  Starting Redis..."
redis-cli ping >/dev/null 2>&1 || redis-server --daemonize yes
echo "  Redis ready"

echo "✅ All services running"
echo ""
echo "Now run:"
echo "  npm run db:migrate"
echo "  npm run db:seed"
echo "  npm run dev"
