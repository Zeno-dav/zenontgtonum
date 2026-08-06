import fs from 'fs';
import path from 'path';

// Memory cache for usage limits
const memoryUsage = {};

export default async function handler(req, res) {
  try {
    // 1. Safely Load keys.json
    const dbPath = path.join(process.cwd(), 'keys.json');
    let keysData = {};

    if (fs.existsSync(dbPath)) {
      const fileContent = fs.readFileSync(dbPath, 'utf8');
      keysData = JSON.parse(fileContent);
    } else {
      return res.status(500).json({ 
        success: false, 
        message: "Server Error: keys.json file not found on server." 
      });
    }

    // 2. Query Parameters Check (Handling both capital and lowercase)
    let Key = req.query.Key || req.query.key;
    if (Key && Key.startsWith('Key=')) {
      Key = Key.replace(/^Key=/, '');
    }

    const term = req.query.term || req.query.num;

    // 3. API Key Check
    if (!Key) {
      return res.status(401).json({ 
        success: false, 
        message: "API key missing! To BUY this API, message on WhatsApp: +639620658587 or Telegram: @Zeno098",
        buy_contact: "WhatsApp: +639620658587",
        telegram: "@Zeno098",
        developer: "@Zeno098"
      });
    }

    // 4. Validate API Key
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

    // 5. Expiry Check
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

    // 6. Daily Limit Check
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

    // 7. Check Term Parameter
    if (!term) {
      return res.status(400).json({ 
        success: false, 
        message: "term or num parameter missing. Please provide a valid Username or Telegram ID." 
      });
    }

    // Increment Usage Count
    memoryUsage[Key].count += 1;

    // 8. Fetch from Upstream API
    const UPSTREAM_URL = `https://free-tg2num.noob73613.workers.dev/?term=${encodeURIComponent(term)}`;
    const response = await fetch(UPSTREAM_URL);

    if (!response.ok) {
      return res.status(response.status).json({ success: false, message: "Upstream API error" });
    }

    const upstreamData = await response.json();

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
    // Return error as JSON instead of crashing Vercel function
    return res.status(500).json({ 
      success: false, 
      error: "Internal Server Error", 
      details: err.message 
    });
  }
}
