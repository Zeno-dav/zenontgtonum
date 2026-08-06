import keysData from './keys.json'; // Direct import for Vercel deployment

// Temporary in-memory usage tracking for serverless
const memoryUsage = {};

export default async function handler(req, res) {
  // Support both capital and lowercase query parameters
  const Key = req.query.Key || req.query.key;
  const term = req.query.term || req.query.num;

  // 1. API Key Check
  if (!Key) {
    return res.status(401).json({ 
      success: false, 
      message: "API key missing! To BUY this API, message on WhatsApp: +639620658587 or Telegram: @Zeno098",
      buy_contact: "WhatsApp: +639620658587",
      telegram: "@Zeno098",
      developer: "@Zeno098"
    });
  }

  // 2. Validate API Key from JSON
  const userRecord = keysData[Key];
  if (!userRecord) {
    return res.status(403).json({ 
      success: false, 
      message: "Invalid API key! To BUY a valid API, message on WhatsApp: +639620658587 or Telegram: @Zeno098",
      buy_contact: "WhatsApp: +639620658587",
      telegram: "@Zeno098",
      developer: "@Zeno098"
    });
  }

  // 3. Expiry Check
  const startDate = new Date(userRecord.startDate);
  const expiryDate = new Date(startDate);
  expiryDate.setDate(expiryDate.getDate() + userRecord.days); 

  const currentTime = new Date();
  if (currentTime > expiryDate) {
    return res.status(403).json({ 
      success: false, 
      message: `This API expired on ${expiryDate.toDateString()}! To RENEW or BUY, message on WhatsApp: +639620658587 or Telegram: @Zeno098`,
      buy_contact: "WhatsApp: +639620658587",
      telegram: "@Zeno098",
      developer: "@Zeno098"
    });
  }

  // 4. Daily Limit Check
  const todayStr = currentTime.toISOString().split('T')[0];
  if (!memoryUsage[Key] || memoryUsage[Key].date !== todayStr) {
    memoryUsage[Key] = { date: todayStr, count: 0 };
  }

  const dailyLimit = userRecord.dailyLimit ?? Infinity;
  if (memoryUsage[Key].count >= dailyLimit) {
    return res.status(429).json({
      success: false,
      message: `Daily limit reached! Used ${memoryUsage[Key].count}/${dailyLimit} requests today.`,
      buy_contact: "WhatsApp: +639620658587",
      telegram: "@Zeno098"
    });
  }

  // 5. Query Parameter Check
  if (!term) {
    return res.status(400).json({ 
      success: false, 
      message: "term or num parameter missing. Please provide a valid Username or Telegram ID." 
    });
  }

  try {
    // Increment Count
    memoryUsage[Key].count += 1;

    // 6. Upstream API Fetch (Updated to your Cloudflare Worker URL)
    const UPSTREAM_URL = `https://free-tg2num.noob73613.workers.dev/?term=${encodeURIComponent(term)}`;
    const response = await fetch(UPSTREAM_URL);

    if (!response.ok) {
      return res.status(response.status).json({ success: false, message: "Upstream API error" });
    }

    const upstreamData = await response.json();

    // 7. Data Not Found Check
    if (!upstreamData || upstreamData.status === false || upstreamData.success === false) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).send(JSON.stringify({
        status: false,
        message: "Database mein data nahi hai (Data not found)",
        query: term,
        usage: `${memoryUsage[Key].count}/${dailyLimit}`,
        brand: "Zeno",
        developer: "@Zeno098",
        bought_from: "WhatsApp: +639620658587 | Telegram: @Zeno098"
      }, null, 2));
    }

    // 8. Dynamic Response Payload
    const cleanResponse = {
      status: true,
      message: "Data fetched successfully",
      api_user: userRecord.name, 
      usage: `${memoryUsage[Key].count}/${dailyLimit}`,
      search_query: term,
      details: upstreamData.details || upstreamData.result || upstreamData,
      brand: "Zeno",
      developer: "@Zeno098",
      bought_from: "WhatsApp: +639620658587 | Telegram: @Zeno098"
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).send(JSON.stringify(cleanResponse, null, 2));

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
