#!/usr/bin/env bash

# ------------------------------------------------------------
# Deploy script for Logic Tech website (cPanel / Node.js app)
# ------------------------------------------------------------
# This script prepares a production‑ready bundle and prints
# instructions for manual upload via cPanel’s File Manager or
# FTP/SFTP. It does **not** perform automatic uploading because
# the exact credentials & server path differ per host.
# ------------------------------------------------------------

set -e

# 1. Verify that a production .env file exists
if [[ ! -f backend/.env ]]; then
  echo "Error: backend/.env not found. Create it with production secrets before deploying."
  exit 1
fi

# 2. Install only production dependencies (already done locally)
# npm ci --omit=dev   # run locally before packaging

# 3. Clean up any existing build artefacts
rm -f logic-tech-website-prod.zip

# 4. Create a zip containing everything needed for the server.
#    Exclude development helpers, Git history, and local node_modules
zip -r logic-tech-website-prod.zip . \
  -x "node_modules/*" \
  -x "*.git*" \
  -x "README.md" \
  -x "deploy.sh" \
  -x "*.zip" \
  -x "backend/.env.example"

# 5. Print next‑step instructions
cat <<'EOF'
--- Deploy package ready ---

Upload the file 'logic-tech-website-prod.zip' to your cPanel account (e.g., via File Manager or FTP).

After uploading:
  1. Extract the zip inside the desired directory (e.g., public_html/logic-tech).
  2. In cPanel → “Setup Node.js App”:
       • Application root: public_html/logic-tech
       • Startup file: backend/server.js (or app.js if you prefer the wrapper)
       • Set the environment variables (copy from backend/.env).
  3. Run "npm ci" from the Terminal (or click the “npm Install” button in the UI).
  4. Restart the app and verify https://logictech.co.ke/api/health returns {"status":"ok"}.

EOF
