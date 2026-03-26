#!/bin/bash

# Deployment script adapted to this repo layout
# Places built server code in dist/server and frontend build in dist/frontend

SERVER_DIR="server"
FRONTEND_DIR="frontend"
REMOTE_USER="manzar"
REMOTE_HOST="192.168.180.2"
REMOTE_BASE="/home/warehouse-app/dev"

if [[ -z "${RM_DEPLOY_PASS}" ]]; then
  echo "Env variable - RM_DEPLOY_PASS not defined exiting...."
  exit 1
else
  password="${RM_DEPLOY_PASS}"
fi

rm -rf dist
rm -f dist.jar

# Build backend
echo "Building backend in $SERVER_DIR..."
cd "$SERVER_DIR" || { echo "$SERVER_DIR not found"; exit 1; }
npx tsc && node copy-folders.js
cd ..

mkdir -p dist/server
if [ -d "$SERVER_DIR/dist" ]; then
  cp -r "$SERVER_DIR/dist/"* dist/server/ || true
fi

# Build frontend
# echo "Building frontend in $FRONTEND_DIR..."
# cd "$FRONTEND_DIR" || { echo "$FRONTEND_DIR not found"; exit 1; }
# npm run build
# cd ..

mkdir -p dist/frontend
if [ -d "$FRONTEND_DIR/dist" ]; then
  cp -r "$FRONTEND_DIR/dist/"* dist/frontend/ || true
fi

# Create odbc and env files in dist/server (adjust secrets as needed)
cat > dist/server/odbc.ini <<'ODBC'
[rmx]
Description = RMTDEVEL Local
Driver = IBM i Access ODBC Driver
System = rmtrucking.RMTRUCKING.COM
UserID = manzar
Password = Ed/1fgiz
Naming = 0
DefaultLibraries = ,RANDM_LCL
Database = RMTDEVEL
ODBC

cat > dist/server/.env <<'ENVFILE'
DB2_CONNECTION_STRING=Driver={IBM i Access ODBC Driver};System=192.168.180.2;UserID=manzar;Password=Ed/1fgiz;NAM=1;CCSID=1208;IgnoreWarnings=1;
DB2_LIBRARY=RANDM_LCL
ENVIRONMENT=qa
PORT=5501
JWT_EXPIRY=36000s
ENVFILE

# Remove existing zip on remote
sshpass -p "$password" ssh "$REMOTE_USER"@"$REMOTE_HOST" "cd $REMOTE_BASE || exit 0; rm -f dist.jar" || true

# Compress
if command -v jar >/dev/null 2>&1; then
  jar -cvf dist.jar dist
else
  if command -v zip >/dev/null 2>&1; then
    zip -r dist.jar dist
  else
    echo "Neither jar nor zip found — cannot compress. Exiting."
    exit 1
  fi
fi

echo "Dist Compressed...."

# Push to remote
sshpass -p "$password" scp dist.jar "$REMOTE_USER"@"$REMOTE_HOST":"$REMOTE_BASE" || { echo "scp failed"; exit 1; }

echo "Files pushed..."

# Pre-deploy cleanup on remote and stop pm2
sshpass -p "$password" ssh "$REMOTE_USER"@"$REMOTE_HOST" << EOF
export PATH=/QOpenSys/pkgs/bin:\$PATH
cd $REMOTE_BASE || exit 0
  cd dist/server || exit 0
  npx pm2 stop "New-Warehouse-QA" || true
cd $REMOTE_BASE
rm -rf server frontend || true
EOF

echo "Clean up on server done....."

# Unpack on remote
sshpass -p "$password" ssh "$REMOTE_USER"@"$REMOTE_HOST" << EOF
export PATH=/QOpenSys/pkgs/bin:\$PATH
cd $REMOTE_BASE
unzip -o dist.jar
EOF

echo "Dist Un-Compressed on Server...."

# Install and start
sshpass -p "$password" ssh "$REMOTE_USER"@"$REMOTE_HOST" << EOF
export PATH=/QOpenSys/pkgs/bin:\$PATH
cd $REMOTE_BASE/dist/server
npm ci --omit=dev
export NODE_ENV=production
npx pm2 start index.js --name "New-Warehouse-QA"
EOF

echo "Server started..."
