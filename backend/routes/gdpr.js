"use strict";
const express = require("express");
const router = express.Router();

const gdprSvc = require("../services/gdprService");
const ipfsSvc = require("../services/ipfsService");

/**
 * POST /api/gdpr/erase
 * GDPR right to erasure: unpin IPFS, mark deleted on SQLite
 */
router.post("/erase", async (req, res) => {
    try {
        const { userId, fileId, cids } = req.body;
        if (!userId || !fileId) return res.status(400).json({ error: "userId and fileId required" });

        // Erase from GDPR DB
        const erasureResult = gdprSvc.fulfillErasure(String(fileId));

        // Unpin from IPFS
        const unpinResults = [];
        if (cids && Array.isArray(cids)) {
            for (const cid of cids) {
                try {
                    await ipfsSvc.unpinFile(cid);
                    unpinResults.push({ cid, status: "unpinned" });
                } catch (e) {
                    unpinResults.push({ cid, status: "error", message: e.message });
                }
            }
        }

        gdprSvc.logAccess(userId.toLowerCase(), String(fileId), "GDPR_ERASE");

        return res.json({
            success: true,
            erasureTimestamp: erasureResult.timestamp,
            ipfsResults: unpinResults,
            message: "File erased from IPFS and GDPR records. Call GDPRCompliance.fulfillErasure() on-chain.",
        });
    } catch (err) {
        console.error("[gdpr/erase]", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/gdpr/export
 * Article 20 data portability export
 */
router.get("/export", (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: "userId query param required" });

        const data = gdprSvc.exportUserData(userId.toLowerCase());
        res.json({ success: true, data });
    } catch (err) {
        console.error("[gdpr/export]", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/gdpr/consent
 * Record or revoke consent
 */
router.post("/consent", (req, res) => {
    try {
        const { userId, consentType, action } = req.body;
        if (!userId || !consentType)
            return res.status(400).json({ error: "userId and consentType required" });

        if (action === "revoke") {
            gdprSvc.revokeConsent(userId.toLowerCase(), consentType);
            return res.json({ success: true, action: "revoked" });
        } else {
            gdprSvc.logConsent(userId.toLowerCase(), consentType);
            return res.json({ success: true, action: "granted", timestamp: Date.now() });
        }
    } catch (err) {
        console.error("[gdpr/consent]", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/gdpr/audit
 * Get audit trail for a user
 */
router.get("/audit", (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: "userId required" });
        const logs = gdprSvc.getAuditTrail(userId.toLowerCase());
        res.json({ success: true, logs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/gdpr/anonymize
 * Anonymise all PII for a given user (GDPR right to be forgotten at account level)
 */
router.post("/anonymize", (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: "userId required" });
        const result = gdprSvc.anonymizeUser(userId.toLowerCase());
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
