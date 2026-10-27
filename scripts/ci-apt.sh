#!/usr/bin/env bash
set -euo pipefail

# GitHub's Azure Ubuntu mirror can stall for tens of minutes before failing over.
# Keep this configuration confined to the pinned, disposable CI runner.
if [[ "${GITHUB_ACTIONS:-}" != true || "$(uname -s)" != Linux ]]; then
  echo 'APT setup is only supported on Linux GitHub Actions runners.' >&2
  exit 1
fi
source /etc/os-release
if [[ "$ID" != ubuntu || "$VERSION_ID" != 24.04 || "$(id -u)" != 0 ]]; then
  echo 'APT setup requires root on Ubuntu 24.04.' >&2
  exit 1
fi
if [[ ! -f /etc/apt/apt-mirrors.txt ]]; then
  echo 'The expected GitHub runner APT mirror list is missing.' >&2
  exit 1
fi

printf '%s\n' 'https://archive.ubuntu.com/ubuntu/' > /etc/apt/apt-mirrors.txt
cat > /etc/apt/apt.conf.d/99moshi-network <<'APT'
Acquire::Retries "2";
Acquire::http::Timeout "30";
Acquire::https::Timeout "30";
APT
