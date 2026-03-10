#!/bin/bash

# ============================================================
# compile.sh – Compile ZKP circuits and generate proving keys
# ============================================================
# Prerequisites:
#   cargo install circom
#   npm install -g snarkjs
#   npm install circomlib              (in circuits directory)
#   wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau
#
# Usage:
#   cd circuits
#   npm install          # installs circomlib
#   bash compile.sh
# ============================================================

set -e

PTAU_FILE="pot12_final.ptau"
CIRCUITS=("fileIntegrity" "accessProof")

# Check for ptau file
if [ ! -f "$PTAU_FILE" ]; then
    echo "⬇️  Downloading Powers of Tau (12-degree)..."
    wget -O "$PTAU_FILE" \
        https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau
fi

for CIRCUIT in "${CIRCUITS[@]}"; do
    echo ""
    echo "══════════════════════════════════════════════"
    echo "  Compiling: ${CIRCUIT}.circom"
    echo "══════════════════════════════════════════════"

    # ── Step 1: Compile circuit ──────────────────────────────────────────
    echo "1/6  circom compile..."
    circom "${CIRCUIT}.circom" --r1cs --wasm --sym \
        -l node_modules -o build/${CIRCUIT}/

    # ── Step 2: Groth16 setup ────────────────────────────────────────────
    echo "2/6  snarkjs groth16 setup..."
    snarkjs groth16 setup \
        build/${CIRCUIT}/${CIRCUIT}.r1cs \
        ${PTAU_FILE} \
        build/${CIRCUIT}/${CIRCUIT}_0000.zkey

    # ── Step 3: Contribute randomness (non-interactive for local dev) ────
    echo "3/6  snarkjs zkey contribute..."
    snarkjs zkey contribute \
        build/${CIRCUIT}/${CIRCUIT}_0000.zkey \
        build/${CIRCUIT}/${CIRCUIT}_final.zkey \
        --name="local contribution" -v -e="random entropy $(date)"

    # ── Step 4: Export verification key ─────────────────────────────────
    echo "4/6  Exporting verification key..."
    snarkjs zkey export verificationkey \
        build/${CIRCUIT}/${CIRCUIT}_final.zkey \
        build/${CIRCUIT}/verification_key.json

    # ── Step 5: Export Solidity verifier ────────────────────────────────
    echo "5/6  Exporting Solidity verifier..."
    snarkjs zkey export solidityverifier \
        build/${CIRCUIT}/${CIRCUIT}_final.zkey \
        ../blockchain/contracts/ZKPVerifier_${CIRCUIT}.sol

    echo "✅  ${CIRCUIT} done!"
done

echo ""
echo "🎉  All circuits compiled successfully!"
echo "    Verifier contracts written to ../blockchain/contracts/"
echo "    Proving keys in build/<circuit>/<circuit>_final.zkey"
echo "    Verification keys in build/<circuit>/verification_key.json"
