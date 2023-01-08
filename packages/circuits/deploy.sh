#!/bin/sh
WALLET="--private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"

V=HashList4Depth4Arity2Verifier
forge create --root . -c generated-sources generated-sources/${V}.sol:${V} $WALLET | tee $V.log
