import { registerOTel } from '@vercel/otel';
import { initializeOTEL } from 'langsmith/experimental/otel/setup';

const { DEFAULT_LANGSMITH_SPAN_PROCESSOR } = initializeOTEL({});

export function register() {
  registerOTel({
    serviceName: 'puzzle-ai-chatbot',
    spanProcessors: [DEFAULT_LANGSMITH_SPAN_PROCESSOR],
  });
}
