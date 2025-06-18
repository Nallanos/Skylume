#!/usr/bin/env bash
# Script de compatibilité qui appelle le script unifié
cd "$(dirname "${BASH_SOURCE[0]}")"
./start_worker_unified.sh "$@"



