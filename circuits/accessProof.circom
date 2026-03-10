pragma circom 2.0.0;

/*
 * accessProof.circom
 *
 * Proves a user holds attributes that satisfy an access policy WITHOUT
 * revealing which specific attributes they possess.
 *
 * Public inputs:
 *   policyHash      – Poseidon hash of the required attribute set (defined by file owner)
 *   userCommitment  – Poseidon(userAttributes[], salt)  published on-chain by user
 *
 * Private inputs:
 *   userAttributes[A] – The user's actual attributes (field elements = keccak256 tags)
 *   salt              – Random blinding factor for the commitment
 *   policyAttrs[A]    – The required policy attributes (to check containment)
 *
 * Constraints:
 *   1. Poseidon(userAttributes, salt) == userCommitment
 *   2. Poseidon(policyAttrs)          == policyHash
 *   3. For each policy attribute: it appears in userAttributes
 *
 * Install circomlib: npm install circomlib
 * Compile: circom accessProof.circom --r1cs --wasm --sym -l node_modules
 */

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

// Check that val appears in arr[N]
template ContainsValue(N) {
    signal input arr[N];
    signal input val;
    signal output found;

    signal matches[N];
    signal isEq[N];

    component eq[N];
    for (var i = 0; i < N; i++) {
        eq[i] = IsEqual();
        eq[i].in[0] <== arr[i];
        eq[i].in[1] <== val;
        matches[i] <== eq[i].out;
    }

    // Sum all matches – at least one must be 1
    signal sum[N+1];
    sum[0] <== 0;
    for (var i = 0; i < N; i++) {
        sum[i+1] <== sum[i] + matches[i];
    }

    // found = 1 if sum[N] >= 1 (we use GreaterThan with bitwidth 4)
    component gt = GreaterThan(4);
    gt.in[0] <== sum[N];
    gt.in[1] <== 0;
    found <== gt.out;
}

// A=number of attributes per user, P=number of policy attributes
template AccessProof(A, P) {
    // ─── Public signals ───────────────────────────────────────────────────
    signal input policyHash;        // Poseidon(policyAttrs[])
    signal input userCommitment;    // Poseidon(userAttributes[], salt)

    // ─── Private signals ──────────────────────────────────────────────────
    signal input userAttributes[A];
    signal input salt;
    signal input policyAttrs[P];

    signal output valid;

    // ── Constraint 1: userCommitment opens correctly ──────────────────────
    component commitHasher = Poseidon(A + 1);
    for (var i = 0; i < A; i++) {
        commitHasher.inputs[i] <== userAttributes[i];
    }
    commitHasher.inputs[A] <== salt;
    commitHasher.out === userCommitment;

    // ── Constraint 2: policyHash opens correctly ──────────────────────────
    component policyHasher = Poseidon(P);
    for (var i = 0; i < P; i++) {
        policyHasher.inputs[i] <== policyAttrs[i];
    }
    policyHasher.out === policyHash;

    // ── Constraint 3: each policy attribute is in userAttributes ─────────
    component contained[P];
    signal allFound[P];
    for (var i = 0; i < P; i++) {
        contained[i] = ContainsValue(A);
        for (var j = 0; j < A; j++) {
            contained[i].arr[j] <== userAttributes[j];
        }
        contained[i].val <== policyAttrs[i];
        allFound[i] <== contained[i].found;
        // Enforce that this attribute WAS found
        allFound[i] === 1;
    }

    valid <== 1;
}

// Instantiate: 8 user attributes, 3 policy attributes
component main {public [policyHash, userCommitment]} = AccessProof(8, 3);
