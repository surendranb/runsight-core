
const { handler } = require('./netlify/functions/ai-coach.js');

async function runTest() {
  const mockEvent = {
    httpMethod: 'POST',
    body: JSON.stringify({
      message: 'Hello Coach! What was my longest run?',
      sessionId: 'test-session-123',
      userId: 'test-user-123',
      runs: [
        {
          id: 1,
          start_date: '2026-05-20T10:00:00Z',
          distance: 5000,
          moving_time: 1500,
          average_heartrate: 145
        },
        {
          id: 2,
          start_date: '2026-05-25T10:00:00Z',
          distance: 15000,
          moving_time: 5400,
          average_heartrate: 155
        }
      ]
    })
  };

  try {
    console.log('Sending request to ai-coach handler...');
    const result = await handler(mockEvent, {});
    console.log('Status Code:', result.statusCode);
    if (result.body) {
      console.log('Body:', JSON.parse(result.body));
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest();
