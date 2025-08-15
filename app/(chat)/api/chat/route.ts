import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
  experimental_createMCPClient,
} from 'ai';
import { auth, type UserType } from '@/app/(auth)/auth';
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import { convertToUIMessages, generateUUID } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { createChart } from '@/lib/ai/tools/create-chart';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { geolocation } from '@vercel/functions';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import { ChatSDKError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';
import type { ChatModel } from '@/lib/ai/models';
import type { VisibilityType } from '@/components/visibility-selector';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp';

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
        console.log(
          ' > Resumable streams are disabled due to missing REDIS_URL',
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  console.log('🚀 POST /api/chat - Request started');
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    console.log('📥 Request body received:', JSON.stringify(json, null, 2));
    requestBody = postRequestBodySchema.parse(json);
    console.log('✅ Request body validation passed');
  } catch (error) {
    console.error('❌ Request body validation failed:', error);
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel['id'];
      selectedVisibilityType: VisibilityType;
    } = requestBody;

    console.log('🔍 Extracted request data:', {
      chatId: id,
      messageId: message.id,
      selectedChatModel,
      selectedVisibilityType,
      messageParts: message.parts.length,
    });

    const session = await auth();
    console.log('👤 Session retrieved:', {
      userId: session?.user?.id,
      userType: session?.user?.type,
      isAuthenticated: !!session?.user,
    });

    if (!session?.user) {
      console.log('❌ User not authenticated');
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const userType: UserType = session.user.type;
    console.log('👤 User type:', userType);

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    console.log('📊 Message count for user (24h):', messageCount);
    console.log(
      '📊 Max messages allowed:',
      entitlementsByUserType[userType].maxMessagesPerDay,
    );

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      console.log('❌ Rate limit exceeded for user');
      return new ChatSDKError('rate_limit:chat').toResponse();
    }

    const chat = await getChatById({ id });
    console.log('💬 Chat lookup result:', {
      chatExists: !!chat,
      chatUserId: chat?.userId,
      currentUserId: session.user.id,
    });

    if (!chat) {
      console.log('🆕 Creating new chat...');
      const title = await generateTitleFromUserMessage({
        message,
      });
      console.log('📝 Generated chat title:', title);

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
      console.log('✅ New chat saved successfully');
    } else {
      if (chat.userId !== session.user.id) {
        console.log('❌ User not authorized to access this chat');
        return new ChatSDKError('forbidden:chat').toResponse();
      }
      console.log('✅ User authorized to access existing chat');
    }

    const messagesFromDb = await getMessagesByChatId({ id });
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];
    console.log('💬 Messages prepared:', {
      fromDb: messagesFromDb.length,
      total: uiMessages.length,
    });

    const { longitude, latitude, city, country } = geolocation(request);
    console.log('📍 Geolocation data:', { longitude, latitude, city, country });

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    console.log('💾 Saving user message to database...');
    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });
    console.log('✅ User message saved successfully');

    const streamId = generateUUID();
    console.log('🆔 Generated stream ID:', streamId);
    await createStreamId({ streamId, chatId: id });
    console.log('✅ Stream ID created in database');

    console.log('🚀 Starting AI stream generation...');

    const httpTransport = new StreamableHTTPClientTransport(
      new URL(
        'https://mcp.data-puzzle.com/subway/mcp?appKey=d43SHnUUxrao4bAHBWgln4U6VWI50vudahXbGK8Q',
      ),
    );
    const httpClient = await experimental_createMCPClient({
      transport: httpTransport,
    });
    const subwayTools = await httpClient.tools();

    console.log('🚇 MCP Tools received:', JSON.stringify(subwayTools, null, 2));

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        console.log('🔄 Executing AI stream with model:', selectedChatModel);
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel, requestHints }),
          messages: convertToModelMessages(uiMessages),
          stopWhen: stepCountIs(5),
          // experimental_activeTools:
          //   selectedChatModel === 'chat-model-reasoning'
          //     ? []
          //       : [
          //         'getWeather',
          //         'createDocument',
          //         'updateDocument',
          //         'requestSuggestions',
          //         'subwayTools',
          //       ],
          experimental_transform: smoothStream({ chunking: 'word' }),
          tools: {
            getWeather: getWeather,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
            createChart: createChart({ session, dataStream }),
            ...subwayTools,
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        console.log('🔄 AI stream created, consuming...');
        result.consumeStream();

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          }),
        );
        console.log('✅ AI stream merged with data stream');
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        console.log('🏁 Stream finished, saving AI messages...', {
          messageCount: messages.length,
        });
        await saveMessages({
          messages: messages.map((message) => ({
            id: message.id,
            role: message.role,
            parts: message.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: id,
          })),
        });
        console.log('✅ AI messages saved successfully');
      },
      onError: (error) => {
        console.error('❌ Stream error occurred:', error);
        return 'Oops, an error occurred!';
      },
    });

    const streamContext = getStreamContext();
    console.log('🔄 Stream context available:', !!streamContext);

    if (streamContext) {
      console.log('📡 Returning resumable stream response');
      return new Response(
        await streamContext.resumableStream(streamId, () =>
          stream.pipeThrough(new JsonToSseTransformStream()),
        ),
      );
    } else {
      console.log('📡 Returning regular stream response');
      return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
    }
  } catch (error) {
    console.error('💥 POST /api/chat - Unexpected error:', error);
    if (error instanceof ChatSDKError) {
      console.log('🔄 Returning ChatSDKError response');
      return error.toResponse();
    }
    console.log('💥 Unhandled error, throwing...');
    throw error;
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chat = await getChatById({ id });

  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
