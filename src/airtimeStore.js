/**
 * Airtime Giveaway Store
 * - Persistent winners list (JSON file) — prevents double-winning
 * - In-memory session state per user (conversation flow)
 */

const fs   = require('fs');
const path = require('path');

const DATA_DIR     = path.join(__dirname, '..', 'data');
const WINNERS_FILE = path.join(DATA_DIR, 'winners.json');

// ── Ensure data directory exists ──────────────────────────────────────────────

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(WINNERS_FILE)) fs.writeFileSync(WINNERS_FILE, JSON.stringify({ winners: [] }, null, 2));

// ── Load winners from disk ────────────────────────────────────────────────────

function loadWinners() {
  try {
    return JSON.parse(fs.readFileSync(WINNERS_FILE, 'utf8'));
  } catch {
    return { winners: [] };
  }
}

function saveWinners(data) {
  fs.writeFileSync(WINNERS_FILE, JSON.stringify(data, null, 2));
}

// ── Check if user has already won ─────────────────────────────────────────────
// Identified by WhatsApp JID (phone number) OR display name

function hasWon(jid, name) {
  const data = loadWinners();
  const jidClean  = (jid  || '').toLowerCase().trim();
  const nameClean = (name || '').toLowerCase().trim();

  return data.winners.some(w =>
    w.jid === jidClean ||
    (nameClean && w.name.toLowerCase() === nameClean)
  );
}

// ── Mark user as winner ───────────────────────────────────────────────────────

function markWinner(jid, name, phone, network) {
  const data = loadWinners();
  data.winners.push({
    jid:    (jid  || '').toLowerCase().trim(),
    name:   (name || '').trim(),
    phone,
    network,
    wonAt:  new Date().toISOString()
  });
  saveWinners(data);
}

// ── In-memory session state per user ─────────────────────────────────────────
// States: 'start' | 'awaiting_reason' | 'awaiting_number' | 'awaiting_confirmation' | 'done'

const sessions = new Map();

function getSession(jid) {
  return sessions.get(jid) || { state: 'start' };
}

function setSession(jid, data) {
  sessions.set(jid, data);
}

function clearSession(jid) {
  sessions.delete(jid);
}

// ── List all winners (for admin use) ─────────────────────────────────────────

function listWinners() {
  return loadWinners().winners;
}

module.exports = {
  hasWon,
  markWinner,
  getSession,
  setSession,
  clearSession,
  listWinners
};
