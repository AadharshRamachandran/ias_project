pragma circom 2.0.0;

/*
 * fileIntegrity.circom
 *
 * Proves knowledge of SHA-256 preimage without revealing file content.
 * Public input : fileHash  (SHA-256 of the file, 2×128-bit limbs)
 * Private input: fileBytes (file content as field elements)
 *
 * NOTE: Full SHA-256 in circom requires the circomlib sha256 template.
 *       Install circomlib:  npm install circomlib
 *       Then compile:       circom fileIntegrity.circom --r1cs --wasm --sym -l node_modules
 *
 * For local development without the full SHA-256 gadget we use Poseidon (also
 * from circomlib) as a drop-in collision-resistant hash.  The backend zkpService
 * uses the same Poseidon hash so proofs verify correctly.
 */

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

template FileIntegrity(N) {
    // ─── Public signals ───────────────────────────────────────────────────
    signal input fileHash;          // Poseidon hash of the file (single field element)

    // ─── Private signals ──────────────────────────────────────────────────
    signal input fileChunks[N];     // File split into N field elements (chunks)

    // ─── Intermediate ─────────────────────────────────────────────────────
    signal output valid;

    // Compute Poseidon hash of file chunks
    component hasher = Poseidon(N);
    for (var i = 0; i < N; i++) {
        hasher.inputs[i] <== fileChunks[i];
    }

    // Enforce: computed hash == provided public hash
    // This is the core ZKP constraint
    signal diff;
    diff <== hasher.out - fileHash;
    diff === 0;

    // Output 1 if valid (always 1 when constraints hold)
    valid <== 1;
}

// Instantiate with N=4 chunks (adjust for larger files)
component main {public [fileHash]} = FileIntegrity(4);
