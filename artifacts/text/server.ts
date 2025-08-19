import { smoothStream, streamText } from 'ai';
import { myProvider } from '@/lib/ai/providers';
import { createDocumentHandler } from '@/lib/artifacts/server';
import { updateDocumentPrompt } from '@/lib/ai/prompts';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp';
import { getMessagesByChatId } from '@/lib/db/queries';
import { convertToUIMessages } from '@/lib/utils';

export const textDocumentHandler = createDocumentHandler<'text'>({
  kind: 'text',
  onCreateDocument: async ({ title, chatId, dataStream, context }) => {
    console.log(`[TEXT] Starting document creation for title: "${title}"`);
    const startTime = Date.now();
    let draftContent = '';
    let chunkCount = 0;

    // 컨텍스트 정보 활용 (우선순위: context > DB에서 가져온 채팅 히스토리)
    let chatContext = '';

    if (context?.recentMessages && context.recentMessages.length > 0) {
      // tool 호출 전에 전달된 컨텍스트 정보 사용
      chatContext = context.recentMessages
        .map(
          (msg) => `${msg.role === 'user' ? '사용자' : 'AI'}: ${msg.content}`,
        )
        .join('\n');

      console.log(
        `[TEXT] Using context from tool call: ${context.recentMessages.length} messages`,
      );
    } else if (chatId) {
      // 기존 방식: DB에서 채팅 히스토리 가져오기
      try {
        const messagesFromDb = await getMessagesByChatId({ id: chatId });
        const uiMessages = convertToUIMessages(messagesFromDb);

        // 사용자와 AI의 대화 내용을 컨텍스트로 구성
        chatContext = uiMessages
          .map(
            (msg) =>
              `${msg.role === 'user' ? '사용자' : 'AI'}: ${msg.parts.map((part) => (part.type === 'text' ? part.text : '')).join(' ')}`,
          )
          .join('\n');

        console.log(
          `[TEXT] Chat context loaded from DB: ${uiMessages.length} messages`,
        );
      } catch (error) {
        console.log(`[TEXT] Failed to load chat context:`, error);
      }
    }

    // 사용자 메시지가 있으면 추가
    if (context?.userMessage) {
      chatContext = `사용자 요청: ${context.userMessage}\n\n${chatContext}`;
      console.log(
        `[TEXT] Added user message from context: ${context.userMessage}`,
      );
    }

    console.log(`[TEXT] Initializing AI stream with language model...`);
    console.log(`[TEXT] Final chat context:`, chatContext);

    const systemPrompt =
      context?.systemPrompt ||
      '사용자의 질문을 배경으로 하여 해당 주제에 대한 문서를 작성하세요. 마크다운을 지원하며, 적절한 곳에 제목을 사용하세요. 사용자의 질문에 대한 답변을 포함하여 포괄적이고 유용한 문서를 만들어주세요. 이전 대화 내용을 참고하여 더 정확하고 맥락에 맞는 문서를 작성하세요.';

    const { fullStream } = streamText({
      model: myProvider.languageModel('artifact-model'),
      system: systemPrompt,
      experimental_transform: smoothStream({ chunking: 'word' }),
      prompt: chatContext
        ? `제목: ${title}\n\n이전 대화 내용:\n${chatContext}\n\n위 내용을 바탕으로 문서를 작성해주세요.`
        : title,
    });

    console.log(`[TEXT] AI stream initialized, starting to process deltas...`);
    for await (const delta of fullStream) {
      const { type } = delta;
      chunkCount++;

      if (type === 'text-delta') {
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

      if (type === 'text-delta') {
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
