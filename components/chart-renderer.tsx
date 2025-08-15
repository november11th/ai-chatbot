'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ComposedChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartData {
  name: string;
  value?: number;
  [key: string]: string | number | undefined;
}

interface ChartConfig {
  type: 'line' | 'area' | 'bar' | 'pie' | 'scatter' | 'composed';
  title: string;
  data: ChartData[];
  xAxis: string;
  yAxis: string;
  colors: string[];
}

const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884D8',
  '#82CA9D',
];

interface ChartRendererProps {
  content: string;
}

export function ChartRenderer({ content }: ChartRendererProps) {
  const chartConfig = useMemo<ChartConfig | null>(() => {
    try {
      const parsed = JSON.parse(content);

      // 기본 차트 설정이 있는지 확인
      if (parsed.type && parsed.data && Array.isArray(parsed.data)) {
        return {
          type: parsed.type || 'line',
          title: parsed.title || '차트',
          data: parsed.data,
          xAxis: parsed.xAxis || 'name',
          yAxis: parsed.yAxis || 'value',
          colors: parsed.colors || COLORS,
        };
      }

      // JSON 데이터가 있지만 차트 형식이 아닌 경우, 기본 차트로 변환 시도
      if (Array.isArray(parsed)) {
        return {
          type: 'line',
          title: '데이터 차트',
          data: parsed.map((item, index) => ({
            name: item.name || `항목 ${index + 1}`,
            value: typeof item.value === 'number' ? item.value : index + 1,
            ...item,
          })),
          xAxis: 'name',
          yAxis: 'value',
          colors: COLORS,
        };
      }

      return null;
    } catch (error) {
      console.warn('Failed to parse chart content:', error);
      return null;
    }
  }, [content]);

  if (!chartConfig || !chartConfig.data || chartConfig.data.length === 0) {
    return null;
  }

  const { type, data, xAxis, yAxis, colors } = chartConfig;

  const commonProps = {
    data,
    margin: { top: 5, right: 30, left: 20, bottom: 5 },
  };

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey={yAxis}
                stroke={colors[0]}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey={yAxis}
                stroke={colors[0]}
                fill={colors[0]}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={yAxis} fill={colors[0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${((percent || 0) * 100).toFixed(0)}%`
                }
                outerRadius={60}
                fill="#8884d8"
                dataKey={yAxis}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.name}-${index}`}
                    fill={colors[index % colors.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Scatter dataKey={yAxis} fill={colors[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'composed':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={yAxis} fill={colors[0]} fillOpacity={0.3} />
              <Line
                type="monotone"
                dataKey={yAxis}
                stroke={colors[1] || colors[0]}
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        );

      default:
        return <div>지원하지 않는 차트 타입입니다.</div>;
    }
  };

  return (
    <Card className="my-4">
      <CardHeader>
        <CardTitle className="text-lg">{chartConfig.title}</CardTitle>
      </CardHeader>
      <CardContent>{renderChart()}</CardContent>
    </Card>
  );
}
