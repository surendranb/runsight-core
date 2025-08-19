// netlify/functions/ai-coach.js - AI coaching service using Gemini 2.5 Flash
const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        error: 'METHOD_NOT_ALLOWED', 
        message: 'Only POST method is allowed' 
      }),
    };
  }

  try {
    const { action, data } = JSON.parse(event.body);
    
    // Get Gemini API key from environment
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.error('[ai-coach] GEMINI_API_KEY environment variable not set');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'CONFIG_ERROR',
          message: 'AI Coach requires setup. Please configure your Gemini API key in the Netlify environment variables.',
          details: 'GEMINI_API_KEY environment variable not configured'
        })
      };
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    let response;
    
    switch (action) {
      case 'analyze_goals':
        response = await analyzeGoals(model, data);
        break;
      case 'generate_insights':
        response = await generateInsights(model, data);
        break;
      case 'create_training_plan':
        response = await createTrainingPlan(model, data);
        break;
      case 'assess_progress':
        response = await assessProgress(model, data);
        break;
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'INVALID_ACTION',
            message: 'Invalid action specified'
          })
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        action,
        response
      })
    };

  } catch (error) {
    console.error('[ai-coach] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'AI_ERROR',
        message: 'Failed to process AI coaching request',
        details: error.message
      })
    };
  }
};

async function analyzeGoals(model, data) {
  const { runningHistory, proposedGoals } = data;
  
  const prompt = `
As an expert running coach, analyze the following runner's data and proposed goals:

RUNNING HISTORY:
- Total runs: ${runningHistory.totalRuns}
- Total distance: ${(runningHistory.totalDistance / 1000).toFixed(1)}km
- Average pace: ${formatPace(runningHistory.averagePace)}
- Recent performance trend: ${runningHistory.trend || 'stable'}
- Consistency: ${runningHistory.consistency || 'moderate'}

PROPOSED GOALS:
${JSON.stringify(proposedGoals, null, 2)}

Please provide:
1. Feasibility assessment (realistic/challenging/too ambitious) for each goal
2. Recommended adjustments if needed
3. Key milestones to track progress
4. Potential risks or concerns
5. Success probability (0-100%) for each goal

Respond in JSON format with structured analysis.
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  
  try {
    return JSON.parse(response.text());
  } catch (e) {
    // If JSON parsing fails, return structured response
    return {
      analysis: response.text(),
      feasibility: 'moderate',
      recommendations: ['Continue current training approach', 'Monitor progress weekly'],
      milestones: ['Monthly distance check', 'Pace improvement tracking'],
      successProbability: 75
    };
  }
}

async function generateInsights(model, data) {
  const { runs, performanceMetrics } = data;
  
  console.log('[generateInsights] Input data:', {
    runsCount: runs?.length || 0,
    performanceMetrics: performanceMetrics
  });
  
  const prompt = `
As a running performance analyst, analyze this runner's data and provide actionable insights:

RECENT PERFORMANCE:
- Last 10 runs average pace: ${formatPace(performanceMetrics.recentPace)}
- Distance trend: ${performanceMetrics.distanceTrend}
- Consistency score: ${performanceMetrics.consistencyScore}/100
- Effort variability: ${performanceMetrics.effortVariability}%

PATTERNS DETECTED:
- Best performing conditions: ${performanceMetrics.bestConditions}
- Improvement areas: ${performanceMetrics.improvementAreas}
- Strengths: ${performanceMetrics.strengths}

Generate 3-5 specific, actionable insights that will help improve performance. Focus on:
1. Training adjustments
2. Recovery recommendations  
3. Performance optimization
4. Goal achievement strategies

Return as JSON array of insight objects with: title, description, priority (high/medium/low), actionSteps.
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const responseText = response.text();
  
  console.log('[generateInsights] AI Response:', responseText);
  
  try {
    const parsed = JSON.parse(responseText);
    console.log('[generateInsights] Parsed successfully:', parsed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    console.error('[generateInsights] JSON parse error:', e.message);
    console.log('[generateInsights] Raw response:', responseText);
    
    // Return fallback insights based on the data we have
    const fallbackInsights = [];
    
    if (performanceMetrics.consistencyScore > 75) {
      fallbackInsights.push({
        title: "Excellent Consistency",
        description: `Your consistency score of ${performanceMetrics.consistencyScore}% shows great dedication. Keep up the regular training schedule.`,
        priority: "medium",
        actionSteps: ["Maintain current running frequency", "Consider gradually increasing distance", "Monitor for signs of overtraining"]
      });
    }
    
    if (performanceMetrics.effortVariability > 20) {
      fallbackInsights.push({
        title: "Pace Consistency Opportunity",
        description: `Your effort variability of ${performanceMetrics.effortVariability}% suggests room for more consistent pacing.`,
        priority: "medium",
        actionSteps: ["Focus on maintaining steady effort during runs", "Use a heart rate monitor or perceived exertion scale", "Practice negative split runs"]
      });
    }
    
    if (performanceMetrics.distanceTrend === 'increasing') {
      fallbackInsights.push({
        title: "Positive Distance Trend",
        description: "Your distance trend is increasing, which shows good progression in your training.",
        priority: "low",
        actionSteps: ["Continue gradual distance increases", "Include rest weeks every 4th week", "Listen to your body for recovery needs"]
      });
    }
    
    // Always provide at least one insight
    if (fallbackInsights.length === 0) {
      fallbackInsights.push({
        title: "Maintain Consistent Training",
        description: "Your current training approach is showing positive results. Continue with regular running schedule.",
        priority: "medium",
        actionSteps: ["Run 3-4 times per week", "Include one long run weekly", "Monitor pace improvements"]
      });
    }
    
    return fallbackInsights;
  }
}

async function createTrainingPlan(model, data) {
  const { currentFitness, goals, timeframe, preferences } = data;
  
  const prompt = `
Create a personalized training plan for this runner:

CURRENT FITNESS:
- Weekly mileage: ${currentFitness.weeklyMileage}km
- Average pace: ${formatPace(currentFitness.averagePace)}
- Long run distance: ${currentFitness.longRunDistance}km
- Training frequency: ${currentFitness.frequency} runs/week

GOALS:
${JSON.stringify(goals, null, 2)}

TIMEFRAME: ${timeframe} weeks
PREFERENCES: ${JSON.stringify(preferences, null, 2)}

Create a structured training plan with:
1. Weekly schedule breakdown
2. Workout types and intensities
3. Progressive mileage increases
4. Recovery recommendations
5. Key workout examples

Return as JSON with weekly structure and detailed guidance.
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  
  try {
    return JSON.parse(response.text());
  } catch (e) {
    return {
      plan: response.text(),
      duration: timeframe,
      weeklyStructure: {
        easy: 3,
        tempo: 1,
        intervals: 1,
        long: 1,
        rest: 1
      }
    };
  }
}

async function assessProgress(model, data) {
  const { goals, currentProgress, timeRemaining } = data;
  
  const prompt = `
Assess this runner's progress toward their goals:

GOALS:
${JSON.stringify(goals, null, 2)}

CURRENT PROGRESS:
${JSON.stringify(currentProgress, null, 2)}

TIME REMAINING: ${timeRemaining} weeks

Provide:
1. Progress assessment (on track/behind/ahead)
2. Specific adjustments needed
3. Motivation and encouragement
4. Updated timeline if necessary
5. Action items for next 2-4 weeks

Return as JSON with structured assessment.
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  
  try {
    return JSON.parse(response.text());
  } catch (e) {
    return {
      status: 'on_track',
      message: response.text(),
      adjustments: ['Continue current approach'],
      nextSteps: ['Monitor weekly progress', 'Maintain consistency']
    };
  }
}

function formatPace(paceSeconds) {
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = Math.floor(paceSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}