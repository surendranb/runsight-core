import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

async function run() {
  try {
    const model = new ChatGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
      model: 'gemini-flash-lite-latest',
    });
    console.log('Invoking model...');
    const res = await model.invoke("Hello");
    console.log('Result:', res.content);
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
