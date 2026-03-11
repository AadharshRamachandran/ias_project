# Zero-Knowledge Proofs (ZKP) in Decentralized Storage

This document explains the advantages of integrating Zero-Knowledge Proofs (ZKP) into the SecureFileShare codebase and provides a technical comparison to distinguish between a system with and without ZKP.

---

## 1. What Advantages Does ZKP Bring?

Integrating ZKP (specifically Groth16 Snarks) provides three primary "superpowers" to a decentralized application:

### A. Privacy-Preserving Verification
In a standard system, to prove you have an attribute (e.g., "Role: Doctor"), you must reveal that attribute to the verifier. With ZKP, you can prove you possess the required attributes **without revealing the attributes themselves**. The blockchain only sees a mathematical proof that "the user satisfies the policy," keeping the user's specific identity and roles private.

### B. Computational Integrity (Trustless Hashing)
When uploading a file, ZKP generates a proof that the IPFS Content Identifier (CID) exactly matches the hash of the original file. This prevents "bait-and-switch" attacks where a malicious server or user provides a valid hash but uploads different data. The ZKP ensures that the data being pinned is mathematically identical to the data being registered on the blockchain.

### C. Reduced On-Chain Load
Verifying a complex set of conditions (like a multi-layer access policy) can be expensive in terms of Gas fees. A ZKP compresses these complex logical checks into a single mathematical verification. The smart contract doesn't need to know the logic; it only needs to run a `verifyProof` function, which has a constant gas cost regardless of how complex the underlying rules are.

---

## 2. Distinguishing the Codebase: With vs. Without ZKP

You can distinguish a ZKP-enabled codebase from a standard one by looking for these specific technical markers:

### 1. File Structure (The "Smoking Gun")
- **With ZKP**: You will see a `circuits/` folder containing `.circom` files (the logic), `.wasm` files (the compiled circuit), and `.zkey` files (the cryptographic keys).
- **Without ZKP**: These directories are absent.

### 2. Smart Contract Logic
- **With ZKP**:
    - Contracts import a `Verifier` or `ZKPVerifier` contract.
    - Functions like `uploadFile` or `checkAccess` take additional parameters: `uint[2] a, uint[2][2] b, uint[2] c` (the proof) and `uint[] publicSignals`.
    - There is a call to `require(verifier.verifyProof(a, b, c, signals), "Invalid Proof")`.
- **Without ZKP**:
    - Contracts rely solely on `mapping` or `require(msg.sender == owner)` for access.
    - Parameters are simple (just strings, addresses, or hashes).

### 3. Backend Dependencies
- **With ZKP**: The `package.json` will include `snarkjs` and `circomlib`. The code will have `import * as snarkjs from "snarkjs"`.
- **Without ZKP**: These dependencies are removed to reduce the bundle size and complexity.

### 4. Data Flow (The "Verification Step")
- **With ZKP**: 
    - **Upload**: `File -> AES Encrypt -> Generate ZKP -> IPFS Upload -> Blockchain Register`.
    - **Download**: `Request -> Generate Access ZKP -> Contract Verifies ZKP -> Decrypt`.
- **Without ZKP**:
    - **Upload**: `File -> AES Encrypt -> IPFS Upload -> Blockchain Register`.
    - **Download**: `Request -> Contract Checks Address -> Decrypt`.

---

## 3. Summary Table

| Feature | Standard Codebase (Current) | ZKP-Enhanced Codebase (Removed) |
| :--- | :--- | :--- |
| **Verification Authority** | Smart Contract Logic (Visible) | Mathematical Proof (Hidden) |
| **Privacy** | Low (Attributes are often public) | High (Attributes remain private) |
| **Complexity** | Low (Easy to maintain) | High (Requires circuit compilation) |
| **Gas Efficiency** | Variable (Depends on logic) | Constant (Fixed proof verification) |
| **Integrity Check** | Relies on Hash comparison | Relies on Cryptographic Proof |
