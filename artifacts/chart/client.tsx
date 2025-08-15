import { Artifact } from '@/components/create-artifact';
import { ChartEditor } from '@/components/chart-editor';
import {
  CopyIcon,
  MessageIcon,
  BarChart3Icon,
  PieChartIcon,
  TrendingUpIcon,
  ActivityIcon,
} from '@/components/icons';
import { toast } from 'sonner';

interface Metadata {
  chartType?: string;
  dataPoints?: number;
}

export const chartArtifact = new Artifact<'chart', Metadata>({
  kind: 'chart',
  description:
    '데이터를 시각화하는 차트를 생성하고 편집할 수 있습니다. 선 그래프, 막대 그래프, 파이 차트 등 다양한 차트 타입을 지원합니다.',
  initialize: async ({ setMetadata }) => {
    setMetadata({
      chartType: 'line',
      dataPoints: 0,
    });
  },
  onStreamPart: ({ streamPart, setArtifact }) => {
    if (streamPart.type === 'data-textDelta') {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.data,
        isVisible:
          draftArtifact.status === 'streaming' &&
          draftArtifact.content.length > 100 &&
          draftArtifact.content.length < 200
            ? true
            : draftArtifact.isVisible,
        status: 'streaming',
      }));
    }
  },
  content: ({ metadata, setMetadata, ...props }) => {
    return <ChartEditor {...props} />;
  },
  actions: [
    {
      icon: <BarChart3Icon size={18} />,
      label: '막대 차트',
      description: '막대 차트로 변경',
      onClick: async ({ content, setMetadata }) => {
        try {
          const config = JSON.parse(content || '{}');
          const newConfig = { ...config, type: 'bar' };

          setMetadata((metadata) => ({
            ...metadata,
            chartType: 'bar',
          }));

          // Note: Content update will be handled by the parent component
        } catch (error) {
          toast.error('차트 설정을 변경할 수 없습니다.');
        }
      },
    },
    {
      icon: <PieChartIcon size={18} />,
      label: '파이 차트',
      description: '파이 차트로 변경',
      onClick: async ({ content, setMetadata }) => {
        try {
          const config = JSON.parse(content || '{}');
          const newConfig = { ...config, type: 'pie' };

          setMetadata((metadata) => ({
            ...metadata,
            chartType: 'pie',
          }));

          // Note: Content update will be handled by the parent component
        } catch (error) {
          toast.error('차트 설정을 변경할 수 없습니다.');
        }
      },
    },
    {
      icon: <TrendingUpIcon size={18} />,
      label: '선 차트',
      description: '선 차트로 변경',
      onClick: async ({ content, setMetadata }) => {
        try {
          const config = JSON.parse(content || '{}');
          const newConfig = { ...config, type: 'line' };

          setMetadata((metadata) => ({
            ...metadata,
            chartType: 'line',
          }));

          // Note: Content update will be handled by the parent component
        } catch (error) {
          toast.error('차트 설정을 변경할 수 없습니다.');
        }
      },
    },
    {
      icon: <ActivityIcon size={18} />,
      label: '영역 차트',
      description: '영역 차트로 변경',
      onClick: async ({ content, setMetadata }) => {
        try {
          const config = JSON.parse(content || '{}');
          const newConfig = { ...config, type: 'area' };

          setMetadata((metadata) => ({
            ...metadata,
            chartType: 'area',
          }));

          // Note: Content update will be handled by the parent component
        } catch (error) {
          toast.error('차트 설정을 변경할 수 없습니다.');
        }
      },
    },
    {
      icon: <CopyIcon size={18} />,
      description: '차트 설정을 클립보드에 복사',
      onClick: ({ content }) => {
        try {
          const config = JSON.parse(content || '{}');
          const configString = JSON.stringify(config, null, 2);
          navigator.clipboard.writeText(configString);
          toast.success('차트 설정이 클립보드에 복사되었습니다!');
        } catch (error) {
          toast.error('차트 설정을 복사할 수 없습니다.');
        }
      },
    },
  ],
  toolbar: [
    {
      icon: <MessageIcon />,
      description: '차트에 대한 설명 추가',
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: 'user',
          parts: [
            {
              type: 'text',
              text: '이 차트에 대한 설명과 분석을 추가해주세요',
            },
          ],
        });
      },
    },
    {
      icon: <BarChart3Icon />,
      description: '차트 스타일 개선',
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: 'user',
          parts: [
            {
              type: 'text',
              text: '이 차트의 시각적 효과와 스타일을 개선해주세요',
            },
          ],
        });
      },
    },
  ],
});
