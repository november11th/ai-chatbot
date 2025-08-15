import { tool, type UIMessageStreamWriter } from 'ai';
import { z } from 'zod';
import type { Session } from 'next-auth';
import type { ChatMessage } from '@/lib/types';

interface CreateChartProps {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
}

export const createChart = ({ session, dataStream }: CreateChartProps) =>
  tool({
    description:
      'Create a chart to visualize data. This tool will generate a chart configuration and display it directly in the chat message.',
    inputSchema: z.object({
      title: z.string().describe('The title of the chart'),
      type: z
        .enum(['line', 'area', 'bar', 'pie', 'scatter', 'composed'])
        .describe('The type of chart to create'),
      data: z
        .array(z.record(z.union([z.string(), z.number()])))
        .describe('The data to visualize'),
      xAxis: z.string().describe('The key for the X-axis data'),
      yAxis: z.string().describe('The key for the Y-axis data'),
      description: z
        .string()
        .optional()
        .describe('Additional description or context for the chart'),
    }),
    execute: async ({ title, type, data, xAxis, yAxis, description }) => {
      const chartConfig = {
        type,
        title,
        data,
        xAxis,
        yAxis,
        colors: [
          '#0088FE',
          '#00C49F',
          '#FFBB28',
          '#FF8042',
          '#8884D8',
          '#82CA9D',
        ],
      };

      const content = JSON.stringify(chartConfig, null, 2);

      // 메시지에 차트 데이터를 직접 출력
      dataStream.write({
        type: 'data-textDelta',
        data: content,
        transient: false,
      });

      return {
        title,
        type,
        dataPoints: data.length,
        chartData: content,
        content: `차트 "${title}"가 생성되었습니다. ${data.length}개의 데이터 포인트를 포함한 ${type} 차트입니다.`,
      };
    },
  });
