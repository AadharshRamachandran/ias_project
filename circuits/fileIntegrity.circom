pragma circom 2.1.0;

include "node_modules/circomlib/circuits/sha256/sha256.circom";

// Basic ZKP: File Integrity Proof
// Proves that the user knows the original file content that hashes to a public fileHash
// without revealing the file content itself.
template FileIntegrity(nChunks) {
    // Private input: The original file data (simplified as chunks of 256 bits for this demo)
    signal input fileData[nChunks];
    
    // Public input: The expected hash of the file
    signal input expectedHash[2]; // SHA256 split into two 128-bit signals

    // Component to calculate SHA256
    // In a real implementation, we would hash the fileData
    // For this simplified demo, we prove knowledge of fileData that satisfies a constraint
    
    signal hashOutput[2];
    
    // Simplified integrity check: Sum of data matches a derived value
    // (In production, this would be a full SHA256 circuit)
    var sum = 0;
    for (var i = 0; i < nChunks; i++) {
        sum += fileData[i];
    }
    
    // The proof asserts that the sum of private data matches the public signal
    // This is the "Basic" integrity check logic
    hashOutput[0] <== sum % 1000000; 
    hashOutput[1] <== sum / 1000000;

    // Constraints
    hashOutput[0] === expectedHash[0];
    hashOutput[1] === expectedHash[1];
}

component main { public [expectedHash] } = FileIntegrity(4);
