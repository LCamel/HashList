#!/usr/bin/env bash

#kill -INT `cat /tmp/remixd/remixd.pid`
#if [ "$1" = "stop" ]; then
#    echo STOP
#    exit 0;
#fi

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

SHARE_DIR=$SCRIPT_DIR/../src
echo "SHARE_DIR: $SHARE_DIR"
echo "DIR: /tmp/remixd"

mkdir -p /tmp/remixd
cd /tmp/remixd

npx --package=@remix-project/remixd -- remixd -s $SHARE_DIR 

#npx --package=@remix-project/remixd -- remixd -s $SHARE_DIR > remixd.log 2>&1 &

#PID=$!
#echo $PID > remixd.pid

#echo "remixd PID: $PID"
