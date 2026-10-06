#!/bin/bash
echo "🛑 Stopping services..."
pkill -f meilisearch 2>/dev/null && echo "  Meilisearch stopped"
redis-cli shutdown 2>/dev/null && echo "  Redis stopped"
pg_ctl -D $PREFIX/var/lib/postgresql stop 2>/dev/null && echo "  PostgreSQL stopped"
echo "✅ All services stopped"
