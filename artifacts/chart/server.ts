import { z } from 'zod';
import { createDocumentHandler } from '@/lib/artifacts/server';

export const chartSchema = z.object({
  type: z.enum(['line', 'area', 'bar', 'pie', 'scatter', 'composed']),
  title: z.string(),
  data: z.array(z.record(z.union([z.string(), z.number()]))),
  xAxis: z.string(),
  yAxis: z.string(),
  colors: z.array(z.string()),
});

export type ChartData = z.infer<typeof chartSchema>;

export const chartArtifact = {
  kind: 'chart' as const,
  schema: chartSchema,
  description: '데이터를 시각화하는 차트를 생성하고 편집할 수 있습니다.',
};

// 차트 문서 핸들러
export const chartDocumentHandler = createDocumentHandler({
  kind: 'chart',
  onCreateDocument: async ({ title, dataStream }) => {
    const defaultChartConfig = {
      type: 'line' as const,
      title: title,
      data: [
        { name: '1월', value: 400 },
        { name: '2월', value: 300 },
        { name: '3월', value: 200 },
        { name: '4월', value: 278 },
        { name: '5월', value: 189 },
      ],
      xAxis: 'name',
      yAxis: 'value',
      colors: ['#0088FE'],
    };

    const content = JSON.stringify(defaultChartConfig, null, 2);

    // 메시지에 차트를 직접 출력
    dataStream.write({
      type: 'data-textDelta',
      data: content,
      transient: false,
    });

    return content;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    // 차트 업데이트 로직
    let content = document.content || '';

    try {
      const currentConfig = JSON.parse(content);
      const updatedConfig = { ...currentConfig };

      // 설명에 따라 차트 타입 변경
      if (description.includes('막대') || description.includes('bar')) {
        updatedConfig.type = 'bar';
      } else if (description.includes('파이') || description.includes('pie')) {
        updatedConfig.type = 'pie';
      } else if (description.includes('선') || description.includes('line')) {
        updatedConfig.type = 'line';
      } else if (description.includes('영역') || description.includes('area')) {
        updatedConfig.type = 'area';
      }

      content = JSON.stringify(updatedConfig, null, 2);
    } catch (error) {
      console.warn('Failed to parse chart content:', error);
    }

    // 메시지에 차트를 직접 출력
    dataStream.write({
      type: 'data-textDelta',
      data: content,
      transient: false,
    });

    return content;
  },
});
