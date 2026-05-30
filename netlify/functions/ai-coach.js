const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { runs } = JSON.parse(event.body);
    
    if (!runs || !Array.isArray(runs) || runs.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No runs provided for analysis' }) };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'GEMINI_API_KEY is not configured' }) };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    // Format runs for the prompt
    // Just take the last 30 runs to avoid context length limits
    const recentRuns = runs.slice(0, 30).map(run => ({
      date: new Date(run.start_date_local).toISOString().split('T')[0],
      distance_km: (run.distance / 1000).toFixed(2),
      pace_min_per_km: ((run.moving_time / 60) / (run.distance / 1000)).toFixed(2),
      heart_rate: run.average_heartrate || 'N/A'
    }));

    const prompt = `You are an expert running coach. Analyze these recent runs from a user:\n
    ${JSON.stringify(recentRuns, null, 2)}
    
    Provide a concise, encouraging, and highly specific analysis. Break your response into:
    1. **Recent Trend**: What they've been doing well.
    2. **Areas for Improvement**: Constructive feedback (e.g. pace variation, consistency).
    3. **Next Step**: A concrete, simple goal for their next week of running.
    
    Keep it conversational, format with clear Markdown, and do not use generic fluff. Assume the runner wants to improve their 10k or Half Marathon fitness over time.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis: responseText })
    };
  } catch (error) {
    console.error('AI Coach Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate AI analysis' })
    };
  }
};
