#!/usr/bin/env bash
CIRCUIT=HashList4Depth4Arity2

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
BASE_DIR=${SCRIPT_DIR}
SRC_DIR=${SCRIPT_DIR}/src
OUT_DIR=${BASE_DIR}/out
GENERATED_SOURCES_DIR=${BASE_DIR}/generated-sources

mkdir -p ${OUT_DIR}
mkdir -p ${GENERATED_SOURCES_DIR}

PTAU_NAME=powersOfTau28_hez_final_13.ptau
#PTAU_NAME=powersOfTau28_hez_final_15.ptau
#PTAU_NAME=powersOfTau28_hez_final_16.ptau
PTAU=${OUT_DIR}/${PTAU_NAME}
if [ ! -f "${PTAU}" ]
then
    curl https://hermez.s3-eu-west-1.amazonaws.com/${PTAU_NAME} > "${PTAU}"
fi

circom ${SRC_DIR}/${CIRCUIT}.circom --r1cs --wasm --sym --c -o ${OUT_DIR}

cd ${OUT_DIR}/${CIRCUIT}_js
npx snarkjs groth16 setup ${OUT_DIR}/${CIRCUIT}.r1cs ${PTAU} ${CIRCUIT}_0000.zkey
echo "blah blah" | npx snarkjs zkey contribute ${CIRCUIT}_0000.zkey ${CIRCUIT}_0001.zkey --name="1st Contributor Name" -v
npx snarkjs zkey export verificationkey ${CIRCUIT}_0001.zkey verification_key.json


npx snarkjs zkey export solidityverifier ${CIRCUIT}_0001.zkey ${CIRCUIT}_verifier.sol
cat ${CIRCUIT}_verifier.sol | sed 's/pragma solidity ^0.6.11/pragma solidity ^0.8.13/' | sed "s/contract Verifier/contract ${CIRCUIT}Verifier/" > ${GENERATED_SOURCES_DIR}/${CIRCUIT}Verifier.sol
