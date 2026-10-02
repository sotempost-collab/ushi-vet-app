#!/bin/bash
# Deploy УшиХвост to Netlify
# Usage: ./scripts/netlify-deploy.sh <NETLIFY_AUTH_TOKEN>

set -e

TOKEN="$1"
SITE_NAME="${2:-ushihvost-vet-app}"

if [ -z "$TOKEN" ]; then
  echo "Error: NETLIFY_AUTH_TOKEN required"
  echo "Usage: $0 <token> [site-name]"
  echo ""
  echo "Get your token at: https://app.netlify.com/user/applications#personal-access-tokens"
  exit 1
fi

cd /home/z/my-project

echo "==> Step 1: Building Next.js project..."
rm -rf .next
npx next build

echo "==> Step 2: Configuring Netlify CLI with token..."
export NETLIFY_AUTH_TOKEN="$TOKEN"

# Try to link to existing site, otherwise create a new one
echo "==> Step 3: Deploying to Netlify (site: $SITE_NAME)..."

# First, try to find if site already exists
SITE_ID=$(netlify api --data '{}' "/sites?filter=name:$SITE_NAME" 2>/dev/null | jq -r '.[0].id // empty' 2>/dev/null || echo "")

if [ -n "$SITE_ID" ]; then
  echo "Found existing site: $SITE_ID"
  netlify deploy --prod --auth="$TOKEN" --site="$SITE_ID"
else
  echo "Creating new site: $SITE_NAME"
  # Create new site with custom name
  CREATE_RESPONSE=$(netlify api -X POST --data "{\"name\":\"$SITE_NAME\",\"custom_namespace\":\"$SITE_NAME\"}" "/sites" 2>&1 || true)
  SITE_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id // empty' 2>/dev/null || echo "")

  if [ -n "$SITE_ID" ]; then
    echo "Created site ID: $SITE_ID"
    netlify deploy --prod --auth="$TOKEN" --site="$SITE_ID"
  else
    # Fallback: just deploy without explicit site name (Netlify will generate)
    echo "Falling back to default deploy..."
    netlify deploy --prod --auth="$TOKEN" --create
  fi
fi

echo ""
echo "==> Done!"
echo ""
echo "To get the URL, run:"
echo "  netlify sites:list --auth=$TOKEN"
