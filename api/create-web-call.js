// api/create-web-call.js
const axios = require('axios');

module.exports = async function (req, res) {
  // Basic CORS handling (allow calls from any origin)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    // allow per-site override; fall back to environment variable
    const agentId = body.agent_id || process.env.RETELL_AGENT_ID;

    console.log(agentId + " from create web call.js");

    const response = await axios.post(
      'https://api.retellai.com/v2/create-web-call',
      {
        agent_id: agentId,
        metadata: body.metadata || { origin: req.headers.origin || 'unknown' }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return res.status(200).json(response.data);
  } catch (err) {
    console.error('Error creating web call:', err.response?.data || err.message || err);
    const message = err.response?.data || err.message || 'Unknown error';
    return res.status(500).json({ error: message });
  }
};
