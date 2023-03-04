#!/usr/bin/env bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )


if [ "$1" = "stop" ]; then
    kill -9 `cat /tmp/anvil/anvil.pid`
    echo STOP
    exit 0;
fi

cast chain-id >/dev/null 2>&1 && exit  # if already running

echo "chdir: /tmp/anvil"
mkdir -p /tmp/anvil
cd /tmp/anvil


# https://github.com/foundry-rs/foundry/issues/3573
# error: { code: -32603, message: 'EVM error InvalidOpcode' }

#source .env
#anvil --gas-limit 30000000 --fork-url=${FORK_URL} --fork-block-number=8166444 -a 2 --steps-tracing > anvil.log 2>&1 &

anvil --gas-limit 30000000 --load-state "${SCRIPT_DIR}/anvil_state_poseidon.json" --steps-tracing > anvil.log 2>&1 &


PID=$!
echo $PID > anvil.pid

until cast chain-id >/dev/null 2>&1 ; do sleep 1 ; done

echo "anvil PID: $PID"
