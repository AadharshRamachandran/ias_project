const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Decentralized Secure File Sharing - Full Test Suite", function () {
    let fileRegistry, accessControl, timeBound, gdpr, zkpVerifier;
    let owner, alice, bob, charlie;

    beforeEach(async function () {
        [owner, alice, bob, charlie] = await ethers.getSigners();

        const FileRegistry = await ethers.getContractFactory("FileRegistry");
        fileRegistry = await FileRegistry.deploy();

        const FileAccessControl = await ethers.getContractFactory("FileAccessControl");
        accessControl = await FileAccessControl.deploy();

        const TimeBoundPermissions = await ethers.getContractFactory("TimeBoundPermissions");
        timeBound = await TimeBoundPermissions.deploy();

        const GDPRCompliance = await ethers.getContractFactory("GDPRCompliance");
        gdpr = await GDPRCompliance.deploy();

        const ZKPVerifier = await ethers.getContractFactory("ZKPVerifier");
        zkpVerifier = await ZKPVerifier.deploy();
    });

    // ─── Helper ────────────────────────────────────────────────────────────────
    async function uploadTestFile(signer) {
        const cids = ["QmTestCID1", "QmTestCID2"];
        const fileHash = ethers.encodeBytes32String("testfilehash");
        const fileId = await fileRegistry.totalFiles();
        await fileRegistry.connect(signer).uploadFile(cids, fileHash, "test.txt", 1024);
        return fileId;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 1: ZKP proof generation and verification
    // ──────────────────────────────────────────────────────────────────────────
    describe("Test 1: ZKP Verifier", function () {
        it("should accept a valid (mocked) proof structure without reverting", async function () {
            // The verifyProof with placeholder VK will return false for random inputs —
            // what we verify here is that the contract accepts the call format correctly.
            const a = [1n, 2n];
            const b = [[1n, 2n], [3n, 4n]];
            const c = [1n, 2n];
            const input = [1n, 2n];

            // Should not revert (may return false with placeholder VK)
            const result = await zkpVerifier.verifyProof(a, b, c, input);
            expect(typeof result).to.equal("boolean");
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 2: ABE encryption/decryption with matching attributes succeeds
    // ──────────────────────────────────────────────────────────────────────────
    describe("Test 2: Access Control - matching attributes", function () {
        it("should grant access when user has all required attributes", async function () {
            const fileId = await uploadTestFile(alice);
            await accessControl.connect(alice).registerFileOwner(fileId);

            const roleAttr = ethers.keccak256(ethers.toUtf8Bytes("role:doctor"));
            const orgAttr = ethers.keccak256(ethers.toUtf8Bytes("org:hospital"));

            // Attribute issuance is restricted to trusted issuers.
            await accessControl.connect(owner).setUserAttributes(bob.address, [roleAttr, orgAttr]);

            // Define policy on file: needs both attributes
            await accessControl.connect(alice).definePolicy(fileId, [roleAttr, orgAttr]);
                await accessControl.connect(alice).grantAccess(fileId, bob.address, []);

            const hasAccess = await accessControl.checkAccess(bob.address, fileId);
            expect(hasAccess).to.equal(true);
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 3: ABE decryption fails when attributes don't match policy
    // ──────────────────────────────────────────────────────────────────────────
    describe("Test 3: Access Control - mismatched attributes", function () {
        it("should deny access when user is missing required attributes", async function () {
            const fileId = await uploadTestFile(alice);
            await accessControl.connect(alice).registerFileOwner(fileId);

            const roleAttr = ethers.keccak256(ethers.toUtf8Bytes("role:doctor"));
            const orgAttr = ethers.keccak256(ethers.toUtf8Bytes("org:hospital"));
            const wrongAttr = ethers.keccak256(ethers.toUtf8Bytes("role:nurse"));

            // Charlie only has "nurse" role, not "doctor"
            await accessControl.connect(owner).setUserAttributes(charlie.address, [wrongAttr]);
            await accessControl.connect(alice).definePolicy(fileId, [roleAttr, orgAttr]);

            const hasAccess = await accessControl.checkAccess(charlie.address, fileId);
            expect(hasAccess).to.equal(false);
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 4: Time-bound permission expires after set duration
    // ──────────────────────────────────────────────────────────────────────────
    describe("Test 4: Time-Bound Permissions - expiry", function () {
        it("should show valid access before expiry", async function () {
            const fileId = await uploadTestFile(alice);
            await timeBound.connect(alice).registerFileOwner(fileId);

            const duration = 3600; // 1 hour
            await timeBound.connect(alice).grantTimedAccess(bob.address, fileId, duration);

            const valid = await timeBound.isAccessValid(bob.address, fileId);
            expect(valid).to.equal(true);
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 5: Expired permission correctly blocks file access
    // ──────────────────────────────────────────────────────────────────────────
    describe("Test 5: Time-Bound Permissions - invalid after expiry", function () {
        it("should block access after permission expires", async function () {
            const fileId = await uploadTestFile(alice);
            await timeBound.connect(alice).registerFileOwner(fileId);

            const duration = 60; // 60 seconds
            await timeBound.connect(alice).grantTimedAccess(bob.address, fileId, duration);

            // Fast-forward time by 2 minutes
            await time.increase(120);

            const valid = await timeBound.isAccessValid(bob.address, fileId);
            expect(valid).to.equal(false);
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 6: GDPR erasure removes file from blockchain
    // ──────────────────────────────────────────────────────────────────────────
    describe("Test 6: GDPR Erasure", function () {
        it("should mark file as deleted after erasure fulfillment", async function () {
            const fileId = await uploadTestFile(alice);
            await gdpr.connect(alice).registerFile(fileId);

            // Request erasure
            await gdpr.connect(alice).requestErasure(fileId);

            // Fulfil erasure + delete on FileRegistry
            await gdpr.connect(alice).fulfillErasure(fileId);
            await fileRegistry.connect(alice).deleteFile(fileId);

            const [, , , , isDeleted, ,] = await fileRegistry.getFile(fileId);
            expect(isDeleted).to.equal(true);

            const erased = await gdpr.getErasureStatus(fileId);
            expect(erased).to.equal(true);
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 7: GDPR data export returns all user records
    // ──────────────────────────────────────────────────────────────────────────
    describe("Test 7: GDPR Data Export", function () {
        it("should return all fileIds owned by user (Article 20)", async function () {
            // Upload 3 files
            for (let i = 0; i < 3; i++) {
                const fileId = await uploadTestFile(alice);
                await gdpr.connect(alice).registerFile(fileId);
            }

            const fileIds = await gdpr.exportUserData(alice.address);
            expect(fileIds.length).to.equal(3);
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 8: File integrity check (hash stored on-chain)
    // ──────────────────────────────────────────────────────────────────────────
    describe("Test 8: File Integrity", function () {
        it("should store and retrieve fileHash correctly", async function () {
            const cids = ["QmIntegrityTest"];
            const originalHash = ethers.keccak256(ethers.toUtf8Bytes("hello world"));
            const fileHashBytes32 = originalHash.slice(0, 66); // first 32 bytes

            const fileId = await fileRegistry.totalFiles();
            await fileRegistry.connect(alice).uploadFile(
                cids,
                fileHashBytes32,
                "integrity_test.txt",
                1000
            );

            const [, , storedHash, , , ,] = await fileRegistry.getFile(fileId);
            expect(storedHash).to.equal(fileHashBytes32);
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 9: Full lifecycle — upload → share → access → erase
    // ──────────────────────────────────────────────────────────────────────────
    describe("Test 9: Full Lifecycle", function () {
        it("should complete upload → share → access → erase workflow", async function () {
            // Upload
            const fileId = await uploadTestFile(alice);

            // Register in all modules
            await accessControl.connect(alice).registerFileOwner(fileId);
            await timeBound.connect(alice).registerFileOwner(fileId);
            await gdpr.connect(alice).registerFile(fileId);

            // Share: grant attributes + timed access to Bob
            const attr = ethers.keccak256(ethers.toUtf8Bytes("role:friend"));
            await accessControl.connect(alice).grantAccess(fileId, bob.address, [attr]);
            await timeBound.connect(alice).grantTimedAccess(bob.address, fileId, 3600);

            // Access checks
            const abacOk = await accessControl.checkAccess(bob.address, fileId);
            const timeOk = await timeBound.isAccessValid(bob.address, fileId);
            expect(abacOk).to.equal(true);
            expect(timeOk).to.equal(true);

            // Erase
            await gdpr.connect(alice).requestErasure(fileId);
            await gdpr.connect(alice).fulfillErasure(fileId);
            await fileRegistry.connect(alice).deleteFile(fileId);

            const [, , , , isDeleted, ,] = await fileRegistry.getFile(fileId);
            expect(isDeleted).to.equal(true);
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 10: Revoke access verification
    // ──────────────────────────────────────────────────────────────────────────
    describe("Test 10: Access Revocation", function () {
        it("should revoke explicit access and block subsequent access", async function () {
            const fileId = await uploadTestFile(alice);
            await accessControl.connect(alice).registerFileOwner(fileId);

            const attr = ethers.keccak256(ethers.toUtf8Bytes("role:admin"));
            await accessControl.connect(alice).grantAccess(fileId, bob.address, [attr]);

            let hasAccess = await accessControl.checkAccess(bob.address, fileId);
            expect(hasAccess).to.equal(true);

            await accessControl.connect(alice).revokeAccess(fileId, bob.address);

            hasAccess = await accessControl.checkAccess(bob.address, fileId);
            expect(hasAccess).to.equal(false);
        });
    });
});
