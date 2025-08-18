import { smoothStream, streamText } from 'ai';
import { myProvider } from '@/lib/ai/providers';
import { createDocumentHandler } from '@/lib/artifacts/server';
import { updateDocumentPrompt } from '@/lib/ai/prompts';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp';

export const textDocumentHandler = createDocumentHandler<'text'>({
  kind: 'text',
  onCreateDocument: async ({ title, dataStream }) => {
    console.log(`[TEXT] Starting document creation for title: "${title}"`);
    const startTime = Date.now();
    let draftContent = '';
    let chunkCount = 0;

    console.log(`[TEXT] Initializing AI stream with language model...`);
    const { fullStream } = streamText({
      model: myProvider.languageModel('artifact-model'),
      system:
        'Write about the given topic. Markdown is supported. Use headings wherever appropriate.',
      experimental_transform: smoothStream({ chunking: 'word' }),
      prompt: title,
    });

    console.log(`[TEXT] AI stream initialized, starting to process deltas...`);
    for await (const delta of fullStream) {
      const { type } = delta;
      chunkCount++;

      if (type === 'text') {
        const { text } = delta;
        draftContent += text;

        console.log(
          `[TEXT] Received text chunk #${chunkCount}: "${text}" (total length: ${draftContent.length})`,
        );

        dataStream.write({
          type: 'data-textDelta',
          data: text,
          transient: true,
        });
      } else {
        console.log(`[TEXT] Received non-text delta #${chunkCount}:`, delta);
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`[TEXT] Document creation completed in ${duration}ms`);
    console.log(
      `[TEXT] Final content length: ${draftContent.length} characters`,
    );
    console.log(`[TEXT] Total chunks processed: ${chunkCount}`);

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    console.log(
      `[TEXT] Starting document update for document ID: ${document.id}`,
    );
    console.log(`[TEXT] Update description: "${description}"`);
    console.log(
      `[TEXT] Original content length: ${document.content?.length || 0} characters`,
    );

    const startTime = Date.now();
    let draftContent = '';
    let chunkCount = 0;

    console.log(`[TEXT] Initializing AI update stream...`);
    const { fullStream } = streamText({
      model: myProvider.languageModel('artifact-model'),
      system: updateDocumentPrompt(document.content || '', 'text'),
      experimental_transform: smoothStream({ chunking: 'word' }),
      prompt: description,
      providerOptions: {
        openai: {
          prediction: {
            type: 'content',
            content: document.content || '',
          },
        },
      },
    });

    console.log(`[TEXT] AI update stream initialized, processing deltas...`);
    for await (const delta of fullStream) {
      const { type } = delta;
      chunkCount++;

      if (type === 'text') {
        const { text } = delta;
        draftContent += text;

        console.log(
          `[TEXT] Received update chunk #${chunkCount}: "${text}" (total length: ${draftContent.length})`,
        );

        dataStream.write({
          type: 'data-textDelta',
          data: text,
          transient: true,
        });
      } else {
        console.log(
          `[TEXT] Received non-text update delta #${chunkCount}:`,
          delta,
        );
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`[TEXT] Document update completed in ${duration}ms`);
    console.log(
      `[TEXT] Updated content length: ${draftContent.length} characters`,
    );
    console.log(`[TEXT] Total update chunks processed: ${chunkCount}`);
    console.log(
      `[TEXT] Content change: ${draftContent.length - (document.content?.length || 0)} characters`,
    );

    return draftContent;
  },
});
