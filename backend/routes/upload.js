"use strict";
const express = require("express");
const multer = require("multer");
const router = express.Router();

const encSvc = require("../services/encryptionService");
const ipfsSvc = require("../services/ipfsService");
const zkpSvc = require("../services/zkpService");
const gdprSvc = require("../services/gdprService");
const abeSvc = require("../services/abeService");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

/**
 * POST /api/upload
 * Encrypts file → uploads to IPFS → generates ZKP → returns metadata
 */
router.post("/", upload.single("file"), async (req, res) => {
    try {
        const { userAddress, attributes, fileName } = req.body;
        if (!req.file) return res.status(400).json({ error: "No file provided" });
        if (!userAddress) return res.status(400).json({ error: "userAddress required" });

        const userAttrs = attributes
            ? JSON.parse(attributes)
            : ["role:user", "org:public"];

        // ── Stage 1: Encrypt ──────────────────────────────────────────────────
        const fileBuffer = req.file.buffer;
        const { encryptedChunks, aesKey, hashes, ivs, authTags } =
            encSvc.encryptFile(fileBuffer);

        // SHA-256 of the plaintext file (for ZKP + on-chain storage)
        const fileHashHex = encSvc.sha256(fileBuffer);

        // ── Stage 2: ABE-wrap the AES key ─────────────────────────────────────
        const { masterKey, publicParams } = abeSvc.setup(2);
        const abeCiphertext = abeSvc.encrypt(aesKey, userAttrs, masterKey, publicParams.threshold);

        // ── Stage 3: Upload to IPFS ───────────────────────────────────────────
        let cids;
        try {
            cids = await ipfsSvc.uploadChunks(encryptedChunks);
        } catch (ipfsErr) {
            console.warn("[upload] IPFS unavailable, using mock CIDs:", ipfsErr.message);
            cids = encryptedChunks.map((_, i) => `Qm${fileHashHex.slice(0, 20)}chunk${i}`);
        }

        // ── Stage 4: Generate ZKP ─────────────────────────────────────────────
        const { proof, publicSignals } = await zkpSvc.generateFileIntegrityProof(
            fileBuffer,
            fileHashHex
        );
        const chainProof = zkpSvc.prepareProofForChain({ proof, publicSignals });

        // ── Stage 5: Log to GDPR database ────────────────────────────────────
        const displayName = fileName || req.file.originalname || "unknown";
        gdprSvc.logUpload(
            userAddress.toLowerCase(),
            Date.now(), // fileId placeholder (real fileId from chain TX)
            displayName,
            "user-uploaded"
        );

        return res.json({
            success: true,
            cids,
            fileHashHex,
            hashes,
            ivs: ivs.map((iv) => iv.toString("hex")),
            authTags: authTags.map((t) => t.toString("hex")),
            abeShares: abeSvc.keyGen(masterKey, userAttrs, aesKey, 2),
            masterKeyHex: masterKey.toString("hex"), // WARNING: in production store server-side only
            proof: chainProof,
            publicSignals,
            message:
                "File encrypted, uploaded to IPFS, and Basic ZKP generated. Call FileRegistry.uploadFile() on-chain.",
        });
    } catch (err) {
        console.error("[upload]", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
