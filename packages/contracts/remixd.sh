#!/usr/bin/env bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

mkdir -p /tmp/remixd
cd /tmp/remixd
npx --package=@remix-project/remixd -- remixd -s $SCRIPT_DIR
