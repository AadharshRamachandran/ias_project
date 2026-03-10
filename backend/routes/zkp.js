"use strict";
const express = require("express");
const router = express.Router();

const zkpSvc = require("../services/zkpService");

/**
 * POST /api/zkp/integrity
 * Generate a file integrity proof (off-chain)
 */
router.post("/integrity", async (req, res) => {
    try {
        const { fileHashHex, fileContentBase64 } = req.body;
        if (!fileHashHex) return res.status(400).json({ error: "fileHashHex required" });

        const fileContent = fileContentBase64
            ? Buffer.from(fileContentBase64, "base64")
            : Buffer.alloc(256); // dummy for hash-only mode

        const { proof, publicSignals } = await zkpSvc.generateFileIntegrityProof(
            fileContent,
            fileHashHex
        );
        const chainProof = zkpSvc.prepareProofForChain({ proof, publicSignals });

        res.json({ success: true, proof, publicSignals, chainProof });
    } catch (err) {
        console.error("[zkp/integrity]", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/zkp/access
 * Generate an attribute-based access proof
 */
router.post("/access", async (req, res) => {
    try {
        const { userAttributes, policy, salt } = req.body;
        if (!userAttributes || !policy)
            return res.status(400).json({ error: "userAttributes and policy required" });

        const result = await zkpSvc.generateAccessProof(userAttributes, policy, salt);
        const chainProof = zkpSvc.prepareProofForChain({
            proof: result.proof,
            publicSignals: result.publicSignals,
        });

        res.json({
            success: true,
            ...result,
            chainProof,
        });
    } catch (err) {
        console.error("[zkp/access]", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/zkp/verify
 * Verify a proof off-chain
 */
router.post("/verify", async (req, res) => {
    try {
        const { proof, publicSignals, circuitName } = req.body;
        if (!proof || !publicSignals)
            return res.status(400).json({ error: "proof and publicSignals required" });

        const valid = await zkpSvc.verifyProofOffchain(
            { proof, publicSignals },
            circuitName || "fileIntegrity"
        );

        res.json({ success: true, valid });
    } catch (err) {
        console.error("[zkp/verify]", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
