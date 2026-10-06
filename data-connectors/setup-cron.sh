#!/bin/bash
# Add cron job to sync every 6 hours

CRON_LINE="0 */6 * * * cd ~/havenfinder/data-connectors && source ~/.env && npm run sync-all >> ~/sync.log 2>&1"

# Check if already exists
if crontab -l 2>/dev/null | grep -q "sync-all"; then
    echo "✅ Cron job already exists"
else
    (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
    echo "✅ Cron job added - will sync every 6 hours"
fi
