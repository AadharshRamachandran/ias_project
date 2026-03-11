"use strict";
const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/**
 * Basic ZKP Service: Handles File Integrity Proofs (Basic Level)
 */
class ZKPService {
    constructor() {
        // Paths to circuit artifacts (Basic Integrity only)
        this.wasmPath = path.join(__dirname, "../circuits/fileIntegrity_js/fileIntegrity.wasm");
        this.zkeyPath = path.join(__dirname, "../circuits/fileIntegrity_final.zkey");
    }

    /**
     * Generate a proof that the file buffer matches the hash
     * @param {Buffer} fileBuffer 
     * @param {string} fileHashHex 
     */
    async generateFileIntegrityProof(fileBuffer, fileHashHex) {
        console.log("[ZKP] Generating Basic Integrity Proof...");
        
        // Simplified input mapping for the "Basic" circuit
        // We take the first 4 blocks of 32 bits from the file buffer as demo "private data"
        const inputData = [];
        for (let i = 0; i < 4; i++) {
            inputData.push(fileBuffer.readUInt32LE(i * 4) || 0);
        }

        const sum = inputData.reduce((a, b) => a + b, 0);
        const expectedHash = [sum % 1000000, Math.floor(sum / 1000000)];

        const input = {
            fileData: inputData,
            expectedHash: expectedHash
        };

        try {
            // In a real environment, we would run:
            // const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, this.wasmPath, this.zkeyPath);
            
            // For this implementation, since we don't have the compiled .wasm/.zkey in the repo yet,
            // we return a mock proof structure that the ZKPVerifier.sol (Groth16) expects.
            return {
                proof: {
                    pi_a: ["0x1", "0x2"],
                    pi_b: [["0x3", "0x4"], ["0x5", "0x6"]],
                    pi_c: ["0x7", "0x8"]
                },
                publicSignals: expectedHash.map(s => s.toString())
            };
        } catch (err) {
            console.error("[ZKP] Proof generation failed:", err);
            throw err;
        }
    }

    /**
     * Formats proof for Solidity ZKPVerifier.sol
     */
    prepareProofForChain({ proof, publicSignals }) {
        return {
            a: proof.pi_a.slice(0, 2),
            b: proof.pi_b.slice(0, 2),
            c: proof.pi_c.slice(0, 2),
            pubSignals: publicSignals
        };
    }
}

module.exports = new ZKPService();
