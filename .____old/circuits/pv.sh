#!/usr/bin/env bash
#CIRCUIT=HashList4Depth4Arity2
CIRCUIT=$1

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
BASE_DIR=${SCRIPT_DIR}
OUT_DIR=${BASE_DIR}/out

INPUT_FILE=${OUT_DIR}/input.json


cd ${OUT_DIR}/${CIRCUIT}_js

time node generate_witness.js ${CIRCUIT}.wasm ${INPUT_FILE} witness.wtns

time npx snarkjs groth16 prove ${CIRCUIT}_0001.zkey witness.wtns proof.json public.json

time npx snarkjs groth16 verify verification_key.json public.json proof.json || exit 1


echo "==== for remix: "
npx snarkjs generatecall public.json proof.json | tee call_remix.txt

echo "==== for .sol: "
cat call_remix.txt | perl -lape 's/\"(.*?)"/uint($1)/g' | tee call_solidity.txt

echo "==== for debugging: "
(echo '['; cat call_remix.txt; echo ']') | jq . | perl -Mbigint -lape 's/(0x(\w+)?)/hex($1)/eg' | tee call_debug.txt

# echo "==== for forge cast: "
# SIG=$(jq .metadata.output.devdoc.methods ../${CIRCUIT}Verifier.sol/${CIRCUIT}Verifier.json | grep -oh 'verifyProof.*[)]')
# cat <<EOF | sed -e 's/"//g' | tee call_forge_cast.txt
# cast call \$ADDR '${SIG}' '$(jq -c '.[0]' call_debug.txt)' '$(jq -c '.[1]' call_debug.txt)' '$(jq -c '.[2]' call_debug.txt)' '$(jq -c '.[3]' call_debug.txt)'
# EOF
