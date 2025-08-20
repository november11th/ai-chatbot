import { openai } from '@ai-sdk/openai';
import { streamText, type UIMessage } from 'ai';
import { initializeOTEL } from 'langsmith/experimental/otel/setup';

const { DEFAULT_LANGSMITH_SPAN_PROCESSOR } = initializeOTEL();

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { model, messages }: { messages: UIMessage[]; model: string } =
    await req.json();

  try {
    const result = await streamText({
      model: openai('gpt-4.1-nano'),
      prompt: 'Write a vegetarian lasagna recipe for 4 people.',
      experimental_telemetry: { isEnabled: true },
    });
    return result.toUIMessageStreamResponse({
      sendReasoning: true,
    });
  } finally {
    await DEFAULT_LANGSMITH_SPAN_PROCESSOR.shutdown();
  }
}
