/**
 * Airtime module — Nigerian network detection + Peyflex top-up
 */

const axios = require('axios');

const PEYFLEX_TOKEN  = process.env.PEYFLEX_TOKEN;
const PEYFLEX_BASE   = 'https://client.peyflex.com.ng/api';
const AIRTIME_AMOUNT = parseInt(process.env.AIRTIME_AMOUNT || '100', 10);

// ── Nigerian network prefix map ───────────────────────────────────────────────

const NETWORK_PREFIXES = {
  mtn: [
    '0703', '0706', '0803', '0806', '0810', '0813', '0814', '0816',
    '0903', '0906', '0913', '0916', '0810', '0814', '0816'
  ],
  airtel: [
    '0701', '0708', '0802', '0808', '0812', '0901', '0902', '0907'
  ],
  glo: [
    '0705', '0805', '0807', '0811', '0815', '0905'
  ],
  '9mobile': [
    '0809', '0817', '0818', '0908', '0909'
  ]
};

const NETWORK_DISPLAY = {
  mtn:     'MTN',
  airtel:  'Airtel',
  glo:     'Glo',
  '9mobile': '9mobile'
};

// ── Normalise phone number to 0XXXXXXXXXX ─────────────────────────────────────

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '');

  if (digits.startsWith('234') && digits.length === 13) {
    return '0' + digits.slice(3);
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return digits;
  }
  if (digits.length === 10) {
    return '0' + digits;
  }
  return null;
}

// ── Detect network from prefix ─────────────────────────────────────────────────

function detectNetwork(rawPhone) {
  const phone = formatPhone(rawPhone);
  if (!phone) return null;

  const prefix = phone.slice(0, 4);

  for (const [key, prefixes] of Object.entries(NETWORK_PREFIXES)) {
    if (prefixes.includes(prefix)) {
      return {
        network:     key,
        networkName: NETWORK_DISPLAY[key],
        phone
      };
    }
  }
  return null;
}

// ── Send airtime via Peyflex ───────────────────────────────────────────────────

async function sendAirtime(phone, network, amount) {
  if (!PEYFLEX_TOKEN) {
    throw new Error('PEYFLEX_TOKEN is not configured');
  }

  const payload = {
    network:       network.toLowerCase(),
    amount:        amount || AIRTIME_AMOUNT,
    mobile_number: phone
  };

  console.log(`📡 Sending ₦${payload.amount} airtime to ${phone} (${network}) via Peyflex...`);

  const response = await axios.post(`${PEYFLEX_BASE}/airtime/topup/`, payload, {
    headers: {
      'Authorization': `Token ${PEYFLEX_TOKEN}`,
      'Content-Type':  'application/json'
    },
    timeout: 20000
  });

  const data = response.data;

  if (data.status === 'SUCCESS' || response.status === 200) {
    console.log(`✅ Airtime sent! Reference: ${data.reference}`);
    return {
      success:   true,
      reference: data.reference,
      balance:   data.balance,
      amount:    data.amount
    };
  }

  throw new Error(`Peyflex returned: ${JSON.stringify(data)}`);
}

module.exports = {
  detectNetwork,
  formatPhone,
  sendAirtime,
  AIRTIME_AMOUNT
};
