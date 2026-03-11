"use strict";
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

// Routes
const uploadRoute = require("./routes/upload");
const accessRoute = require("./routes/access");
const gdprRoute = require("./routes/gdpr");

// Services
const gdprSvc = require("./services/gdprService");

const app = express();
const PORT = process.env.PORT || 3001;

// ─────────────────────────── Middleware ───────────────────────────────────

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    credentials: true,
}));
app.use(morgan("dev"));

// ─────────────────────────── GDPR DB Init ────────────────────────────────

// Ensure SQLite schema is created at startup
try {
    gdprSvc.initSchema();
    console.log("✅ GDPR SQLite database initialized");
} catch (err) {
    console.error("❌ Failed to init GDPR DB:", err.message);
}

// ─────────────────────────── Routes ──────────────────────────────────────

app.use("/api/upload", uploadRoute);
app.use("/api", accessRoute);           // /api/share and /api/access/:fileId
app.use("/api/gdpr", gdprRoute);

// ─────────────────────────── Health Check ────────────────────────────────

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        services: {
            expressServer: "running",
            gdprDb: "connected",
        },
    });
});

// ─────────────────────────── 404 / Error ─────────────────────────────────

app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error("[server]", err);
    res.status(500).json({ error: err.message || "Internal server error" });
});

// ─────────────────────────── Start ───────────────────────────────────────

app.listen(PORT, () => {
    console.log("\n🚀 SecureFileShare Backend running!");
    console.log(`   URL:  http://localhost:${PORT}`);
    console.log(`   IPFS: http://127.0.0.1:5001 (start with: ipfs daemon)`);
    console.log("─".repeat(50));
    console.log("   Routes:");
    console.log("   POST /api/upload           – Encrypt + upload file");
    console.log("   POST /api/share            – Share file (ABE key wrap)");
    console.log("   GET  /api/access/:fileId   – Access and decrypt file");
    console.log("   POST /api/gdpr/erase       – GDPR right to erasure");
    console.log("   GET  /api/gdpr/export      – GDPR Article 20 export");
    console.log("   POST /api/gdpr/consent     – Consent management");
    console.log("   GET  /api/gdpr/audit       – Access audit trail");
    console.log("─".repeat(50));
});

module.exports = app;
