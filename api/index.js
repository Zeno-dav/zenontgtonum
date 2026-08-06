import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const { num, Key } = req.query;

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

  // 2. Load Keys Database
  const dbPath = path.join(process.cwd(), 'keys.json');
  let keysData = {};
  
  if (fs.existsSync(dbPath)) {
    keysData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  }

  // 3. Validate API Key
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

  // 4. AUTOMATIC EXPIRY DATE CALCULATION
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

  // 5. DAILY LIMIT CHECK & RESET LOGIC
  const todayStr = currentTime.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  const dailyLimit = userRecord.dailyLimit ?? Infinity;

  // Reset count if it's a new day or if lastResetDate is missing
  if (userRecord.lastResetDate !== todayStr) {
    userRecord.usageCount = 0;
    userRecord.lastResetDate = todayStr;
  }

  // Check if user has exceeded their daily limit
  if (userRecord.usageCount >= dailyLimit) {
    return res.status(429).json({
      success: false,
      message: `Daily limit reached! You have used ${userRecord.usageCount}/${dailyLimit} requests for today. Try again tomorrow or upgrade your plan.`,
      buy_contact: "WhatsApp: +639620658587",
      telegram: "@Zeno098",
      developer: "@Zeno098"
    });
  }

  // 6. Check num parameter
  if (!num) {
    return res.status(400).json({ 
      success: false, 
      message: "num parameter missing. Please provide a valid Username or Telegram ID." 
    });
  }

  try {
    // Increment usage count and write back to JSON
    userRecord.usageCount += 1;
    keysData[Key] = userRecord;
    fs.writeFileSync(dbPath, JSON.stringify(keysData, null, 2), 'utf8');

    // 7. Upstream API Fetch
    const UPSTREAM_URL = `https://free-tg2num.noob73613.workers.dev/?term=${encodeURIComponent(num)}`;
    
    const response = await fetch(UPSTREAM_URL);

    if (!response.ok) {
      return res.status(response.status).json({ success: false, message: "Upstream API error" });
    }

    const upstreamData = await response.json();

    // 8. Data Not Found Check
    if (!upstreamData || upstreamData.success !== true || !upstreamData.tg_id) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).send(JSON.stringify({
        status: false,
        message: "Database mein data nahi hai (Data not found)",
        query: num,
        usage: `${userRecord.usageCount}/${dailyLimit}`,
        brand: "Zeno",
        developer: "@Zeno098",
        bought_from: "WhatsApp: +639620658587 | Telegram: @Zeno098"
      }, null, 2));
    }

    // 9. Clean JSON Mapped to the Correct Flat Structure
    const cleanResponse = {
      status: true,
      message: "Data fetched successfully",
      api_user: userRecord.name, 
      usage: `${userRecord.usageCount}/${dailyLimit}`,
      search_query: num,
      details: {
        telegram_id: upstreamData.tg_id || "Not Found",
        username: upstreamData.username || "Not Found",
        phone_number: upstreamData.number || "Not Found",
        country: upstreamData.country || "Not Found",
        country_code: upstreamData.country_code || "Not Found"
      },
      brand: "Zeno",
      developer: "@Zeno098",
      bought_from: "WhatsApp: +639620658587 | Telegram: @Zeno098"
    };

    // 10. Return Formatted JSON
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).send(JSON.stringify(cleanResponse, null, 2));

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
