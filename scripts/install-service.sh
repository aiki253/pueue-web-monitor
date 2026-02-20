#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
USER="$(whoami)"

SERVICE_FILE="/etc/systemd/system/pueue-web-monitor.service"

cat <<EOF | sudo tee "$SERVICE_FILE" > /dev/null
[Unit]
Description=PC Monitor Web App
After=network.target

[Service]
Type=simple
User=${USER}
WorkingDirectory=${PROJECT_DIR}
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
RestartSec=5
EnvironmentFile=-${PROJECT_DIR}/.env

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
echo "Installed: ${SERVICE_FILE}"
echo "  User=${USER}"
echo "  WorkingDirectory=${PROJECT_DIR}"
echo ""
echo "Run:  sudo systemctl enable --now pueue-web-monitor"
