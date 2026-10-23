#!/usr/bin/env bash
# Installs the Ensis infrastructure collector (docs/monitoring/omni-collector.py) as a systemd service.
#
# Run as root on the server you want to monitor:
#   sudo bash install-omni-collector.sh \
#     --url https://api.ensis.in/api/v1/infrastructure/ingest \
#     --token omi_col_xxxxxxxx \
#     [--name ensis] [--collector ./omni-collector.py] [--docker]
#
# --name      Service suffix, so one server can report to two dashboards (e.g. ensis and organic):
#             creates omni-collector-<name>.service. Default: no suffix (omni-collector.service).
# --collector Path to omni-collector.py. Default: next to this script.
# --docker    Also report container state (needs the service user to read the Docker socket).
#
# The token is kept in /etc/omni/<service>.env (root-only, mode 600), not in the unit file,
# because unit files are world-readable. Re-running the script updates URL/token and restarts.
set -euo pipefail

URL="" TOKEN="" NAME="" DOCKER="" COLLECTOR=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

die() { echo "ERROR: $*" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --url) URL="${2:-}"; shift 2 ;;
    --token) TOKEN="${2:-}"; shift 2 ;;
    --name) NAME="${2:-}"; shift 2 ;;
    --collector) COLLECTOR="${2:-}"; shift 2 ;;
    --docker) DOCKER="--docker"; shift ;;
    -h|--help) sed -n '2,18p' "$0"; exit 0 ;;
    *) die "Unknown option: $1 (see --help)" ;;
  esac
done

[[ $EUID -eq 0 ]] || die "Run as root (sudo), systemd units are installed in /etc/systemd/system."
[[ "$URL" == https://* ]] || die "--url must start with https:// (copy it from Admin > Infrastructure > server > Monitoring setup)."
[[ "$TOKEN" == omi_col_* ]] || die "--token must start with omi_col_ (create it in Admin > Infrastructure > server > Monitoring setup)."
[[ -z "$NAME" || "$NAME" =~ ^[a-z0-9-]+$ ]] || die "--name may only contain a-z, 0-9 and -."
command -v systemctl >/dev/null || die "systemd is required."

if [[ -z "$COLLECTOR" ]]; then
  for candidate in "$SCRIPT_DIR/omni-collector.py" "$SCRIPT_DIR/../../docs/monitoring/omni-collector.py" "./omni-collector.py"; do
    [[ -f "$candidate" ]] && { COLLECTOR="$candidate"; break; }
  done
fi
[[ -n "$COLLECTOR" && -f "$COLLECTOR" ]] || die "omni-collector.py not found. Copy it next to this script or pass --collector <path>."

if ! command -v python3 >/dev/null; then
  echo "python3 not found, installing..."
  if command -v apt-get >/dev/null; then apt-get update -qq && apt-get install -y -qq python3
  elif command -v dnf >/dev/null; then dnf install -y -q python3
  elif command -v yum >/dev/null; then yum install -y -q python3
  else die "Install python3 manually, then re-run."; fi
fi

SERVICE="omni-collector${NAME:+-$NAME}"
ENV_FILE="/etc/omni/${SERVICE}.env"

echo "==> Installing collector to /opt/omni/omni-collector.py"
install -d -m 755 /opt/omni
install -m 755 "$COLLECTOR" /opt/omni/omni-collector.py

echo "==> Dry run (reads /proc, sends nothing)"
python3 /opt/omni/omni-collector.py --dry-run >/dev/null || die "Collector dry run failed."

echo "==> Sending one test sample to $URL"
# --once prints "rejected <code>" / "error" instead of failing, so check the output too
TEST_OUT="$(OMNI_URL="$URL" OMNI_TOKEN="$TOKEN" python3 /opt/omni/omni-collector.py --once $DOCKER 2>&1 || true)"
echo "$TEST_OUT"
if grep -qiE "rejected|error" <<<"$TEST_OUT"; then
  die "The API did not accept the sample. Check the token (it belongs to one server) and that this server can reach the API: curl -I ${URL%/api/*}"
fi

echo "==> Writing $ENV_FILE (mode 600)"
install -d -m 700 /etc/omni
umask 077
cat > "$ENV_FILE" <<EOF
OMNI_URL=$URL
OMNI_TOKEN=$TOKEN
EOF

echo "==> Writing /etc/systemd/system/${SERVICE}.service"
cat > "/etc/systemd/system/${SERVICE}.service" <<EOF
[Unit]
Description=Ensis infrastructure collector (${SERVICE})
After=network-online.target
Wants=network-online.target

[Service]
User=nobody
EnvironmentFile=${ENV_FILE}
ExecStart=/usr/bin/env python3 /opt/omni/omni-collector.py ${DOCKER}
Restart=always
RestartSec=15
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now "$SERVICE" >/dev/null
systemctl restart "$SERVICE"
sleep 3

if systemctl is-active --quiet "$SERVICE"; then
  echo
  echo "OK: $SERVICE is running. CPU, memory and disk appear in the admin within a minute."
  echo "    Logs:      journalctl -u $SERVICE -n 20"
  echo "    Uninstall: systemctl disable --now $SERVICE && rm /etc/systemd/system/${SERVICE}.service $ENV_FILE"
else
  journalctl -u "$SERVICE" -n 20 --no-pager || true
  die "$SERVICE did not start (logs above)."
fi
