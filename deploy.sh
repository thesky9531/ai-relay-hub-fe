#!/bin/bash
set -e

SERVER="124.222.83.211"
USER="ubuntu"
REMOTE_DIR="/home/ubuntu/ai-relay/hub-fe"

echo "=== Building ==="
npm run build

echo "=== Uploading ==="
ssh ${USER}@${SERVER} "mkdir -p ${REMOTE_DIR}"
scp -r dist/* ${USER}@${SERVER}:${REMOTE_DIR}/dist/

echo "=== Done ==="
