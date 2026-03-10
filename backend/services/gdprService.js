"use strict";
const Database = require("better-sqlite3");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

/**
 * gdprService.js
 *
 * SQLite-backed GDPR compliance module.
 * Tables:
 *   user_data_registry   – tracks every upload per user
 *   erasure_requests     – pending/fulfilled erasure requests
 *   access_logs          – every file access event
 *   consent_records      – user consent per purpose
 *
 * All operations use synchronous better-sqlite3 for simplicity.
 * PII anonymisation replaces userId with SHA-256 hash on deletion.
 */

const DB_DIR = path.join(__dirname, "..", "db");
const DB_PATH = path.join(DB_DIR, "gdpr.db");

let db;

function getDb() {
    if (!db) {
        fs.mkdirSync(DB_DIR, { recursive: true });
        db = new Database(DB_PATH);
        initSchema();
    }
    return db;
}

function initSchema() {
    const database = getDb();
    database.exec(`
    CREATE TABLE IF NOT EXISTS user_data_registry (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      userId           TEXT    NOT NULL,
      fileId           TEXT    NOT NULL,
      fileName         TEXT,
      uploadTimestamp  INTEGER NOT NULL,
      dataCategories   TEXT,
      isAnonymised     INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_udr_userId ON user_data_registry(userId);

    CREATE TABLE IF NOT EXISTS erasure_requests (
      requestId        INTEGER PRIMARY KEY AUTOINCREMENT,
      userId           TEXT    NOT NULL,
      fileId           TEXT    NOT NULL,
      requestTimestamp INTEGER NOT NULL,
      status           TEXT    DEFAULT 'pending',
      fulfilledAt      INTEGER
    );

    CREATE TABLE IF NOT EXISTS access_logs (
      logId            INTEGER PRIMARY KEY AUTOINCREMENT,
      userId           TEXT    NOT NULL,
      fileId           TEXT    NOT NULL,
      accessTimestamp  INTEGER NOT NULL,
      action           TEXT    NOT NULL,
      ipAddress        TEXT,
      isAnonymised     INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_al_userId ON access_logs(userId);

    CREATE TABLE IF NOT EXISTS consent_records (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      userId           TEXT    NOT NULL,
      consentType      TEXT    NOT NULL,
      consentTimestamp INTEGER NOT NULL,
      isActive         INTEGER DEFAULT 1,
      revokedAt        INTEGER,
      UNIQUE(userId, consentType)
    );
  `);
}

// ─────────────────────────── Uploads ─────────────────────────────────────

function logUpload(userId, fileId, fileName, dataCategories = "general") {
    const db = getDb();
    db.prepare(
        `INSERT INTO user_data_registry (userId, fileId, fileName, uploadTimestamp, dataCategories)
     VALUES (?, ?, ?, ?, ?)`
    ).run(userId, String(fileId), fileName, Date.now(), dataCategories);
}

// ─────────────────────────── Access Logs ─────────────────────────────────

function logAccess(userId, fileId, action, ipAddress = null) {
    const db = getDb();
    db.prepare(
        `INSERT INTO access_logs (userId, fileId, accessTimestamp, action, ipAddress)
     VALUES (?, ?, ?, ?, ?)`
    ).run(userId, String(fileId), Date.now(), action, ipAddress);
}

// ─────────────────────────── Erasure ─────────────────────────────────────

function requestErasure(userId, fileId) {
    const db = getDb();
    const existing = db.prepare(
        `SELECT * FROM erasure_requests WHERE userId = ? AND fileId = ? AND status = 'pending'`
    ).get(userId, String(fileId));

    if (existing) {
        return { requestId: existing.requestId, status: "already_pending" };
    }

    const result = db.prepare(
        `INSERT INTO erasure_requests (userId, fileId, requestTimestamp, status)
     VALUES (?, ?, ?, 'pending')`
    ).run(userId, String(fileId), Date.now());

    return { requestId: result.lastInsertRowid, status: "pending" };
}

function fulfillErasure(fileId) {
    const db = getDb();
    const ts = Date.now();
    db.prepare(
        `UPDATE erasure_requests SET status = 'fulfilled', fulfilledAt = ?
     WHERE fileId = ? AND status = 'pending'`
    ).run(ts, String(fileId));

    // Also anonymize the upload registry record
    anonymizeFileRecords(fileId);
    return { status: "fulfilled", timestamp: ts };
}

// ─────────────────────────── Consent ─────────────────────────────────────

function logConsent(userId, consentType) {
    const db = getDb();
    db.prepare(
        `INSERT INTO consent_records (userId, consentType, consentTimestamp, isActive)
     VALUES (?, ?, ?, 1)
     ON CONFLICT(userId, consentType) DO UPDATE SET
       isActive = 1, consentTimestamp = excluded.consentTimestamp, revokedAt = NULL`
    ).run(userId, consentType, Date.now());
}

function revokeConsent(userId, consentType) {
    const db = getDb();
    db.prepare(
        `UPDATE consent_records SET isActive = 0, revokedAt = ?
     WHERE userId = ? AND consentType = ?`
    ).run(Date.now(), userId, consentType);
}

// ─────────────────────────── GDPR Article 20 Export ──────────────────────

/**
 * Export all data associated with a userId as a JSON-serialisable object.
 * @param {string} userId  Ethereum wallet address.
 * @returns {object}
 */
function exportUserData(userId) {
    const db = getDb();
    return {
        userId,
        exportedAt: new Date().toISOString(),
        files: db
            .prepare(`SELECT * FROM user_data_registry WHERE userId = ?`)
            .all(userId),
        erasureRequests: db
            .prepare(`SELECT * FROM erasure_requests WHERE userId = ?`)
            .all(userId),
        accessLogs: db
            .prepare(`SELECT * FROM access_logs WHERE userId = ? AND isAnonymised = 0`)
            .all(userId),
        consentRecords: db
            .prepare(`SELECT * FROM consent_records WHERE userId = ?`)
            .all(userId),
    };
}

/**
 * Return the full audit trail (access logs) for a user.
 */
function getAuditTrail(userId) {
    const db = getDb();
    return db
        .prepare(
            `SELECT * FROM access_logs WHERE userId = ? ORDER BY accessTimestamp DESC LIMIT 500`
        )
        .all(userId);
}

// ─────────────────────────── Anonymisation ───────────────────────────────

/**
 * Replace userId PII with a SHA-256 hash in all tables.
 * @param {string} userId  Original wallet address.
 */
function anonymizeUser(userId) {
    const db = getDb();
    const anonId = "0x" + crypto.createHash("sha256").update(userId).digest("hex");

    db.transaction(() => {
        db.prepare(
            `UPDATE user_data_registry SET userId = ?, isAnonymised = 1 WHERE userId = ?`
        ).run(anonId, userId);
        db.prepare(
            `UPDATE erasure_requests SET userId = ? WHERE userId = ?`
        ).run(anonId, userId);
        db.prepare(
            `UPDATE access_logs SET userId = ?, isAnonymised = 1 WHERE userId = ?`
        ).run(anonId, userId);
        db.prepare(
            `UPDATE consent_records SET userId = ? WHERE userId = ?`
        ).run(anonId, userId);
    })();

    return { anonymisedAs: anonId };
}

function anonymizeFileRecords(fileId) {
    const db = getDb();
    const anonId = "0x[erased]";
    db.prepare(
        `UPDATE access_logs SET isAnonymised = 1 WHERE fileId = ?`
    ).run(String(fileId));
}

module.exports = {
    initSchema,
    logUpload,
    logAccess,
    requestErasure,
    fulfillErasure,
    logConsent,
    revokeConsent,
    exportUserData,
    getAuditTrail,
    anonymizeUser,
};
