require('dotenv').config();

// ── Keep-alive server for Replit/UptimeRobot ──────────────────────────────────
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Amòfin is online! ⚖️');
}).listen(process.env.PORT || 3000, () => {
  console.log(`🌐 Keep-alive server on port ${process.env.PORT || 3000}`);
});

// ── Validate required secrets ─────────────────────────────────────────────────
const required = ['WHATSAPP_NUMBER', 'PEYFLEX_TOKEN'];
const missing = required.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`❌ Missing required secrets:\n  ${missing.join('\n  ')}`);
  console.error('\n👉 Add them in Replit Secrets panel.\n');
  process.exit(1);
}

const hasAnyAiKey =
  process.env.GEMINI_API_KEY ||
  process.env.GROQ_API_KEY ||
  process.env.NVIDIA_API_KEY;

if (!hasAnyAiKey) {
  console.error('❌ At least one AI key is required: GROQ_API_KEY, NVIDIA_API_KEY, or GEMINI_API_KEY');
  process.exit(1);
}

const AIRTIME_AMOUNT = process.env.AIRTIME_AMOUNT || '100';
console.log(`💰 Airtime giveaway amount: ₦${AIRTIME_AMOUNT} per winner`);

const { startBot } = require('./src/bot');

console.log('\n🎁 Airtime Giveaway Bot starting...\n');
startBot().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
