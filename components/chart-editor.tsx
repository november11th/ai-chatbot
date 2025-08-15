'use client';

import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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

const DEFAULT_CHART_CONFIG: ChartConfig = {
  type: 'line',
  title: '새로운 차트',
  data: [
    { name: '1월', value: 400 },
    { name: '2월', value: 300 },
    { name: '3월', value: 200 },
    { name: '4월', value: 278 },
    { name: '5월', value: 189 },
  ],
  xAxis: 'name',
  yAxis: 'value',
  colors: COLORS.slice(0, 1),
};

interface ChartEditorProps {
  title: string;
  content: string;
  mode: 'edit' | 'diff';
  status: 'streaming' | 'idle';
  onSaveContent: (content: string, debounce: boolean) => void;
  isInline: boolean;
  isLoading?: boolean;
}

export function ChartEditor({
  title,
  content,
  mode,
  status,
  onSaveContent,
  isInline,
  isLoading,
}: ChartEditorProps) {
  const [chartConfig, setChartConfig] =
    useState<ChartConfig>(DEFAULT_CHART_CONFIG);
  const [dataInput, setDataInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Parse content to chart config
  useEffect(() => {
    if (content?.trim()) {
      try {
        const parsed = JSON.parse(content);
        setChartConfig(parsed);
      } catch (error) {
        console.warn('Failed to parse chart content:', error);
      }
    }
  }, [content]);

  // Save chart config to content
  const saveChartConfig = useCallback(
    (config: ChartConfig) => {
      const configString = JSON.stringify(config, null, 2);
      onSaveContent(configString, false);
    },
    [onSaveContent],
  );

  // Parse CSV-like data input
  const parseDataInput = useCallback(
    (input: string) => {
      const lines = input.trim().split('\n');
      if (lines.length < 2) return;

      const headers = lines[0].split(',').map((h) => h.trim());
      const data: ChartData[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim());
        if (values.length === headers.length) {
          const item: ChartData = { name: values[0] };
          headers.forEach((header, index) => {
            if (index === 0) {
              item.name = values[index];
            } else {
              item[header] = Number.parseFloat(values[index]) || 0;
            }
          });
          data.push(item);
        }
      }

      if (data.length > 0) {
        const newConfig = { ...chartConfig, data };
        setChartConfig(newConfig);
        saveChartConfig(newConfig);
      }
    },
    [chartConfig, saveChartConfig],
  );

  // Render chart based on type
  const renderChart = useCallback(() => {
    const { type, data, xAxis, yAxis, colors } = chartConfig;

    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
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
          <ResponsiveContainer width="100%" height={400}>
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
          <ResponsiveContainer width="100%" height={400}>
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
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${((percent || 0) * 100).toFixed(0)}%`
                }
                outerRadius={80}
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
          <ResponsiveContainer width="100%" height={400}>
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
          <ResponsiveContainer width="100%" height={400}>
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
  }, [chartConfig]);

  if (mode === 'diff') {
    return (
      <div className="p-4">
        <div className="text-sm text-muted-foreground">
          차트 편집 모드에서는 차이점을 볼 수 없습니다.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-96 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Chart Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>차트 설정</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? '닫기' : '편집'}
            </Button>
          </CardTitle>
        </CardHeader>
        {isEditing && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="chart-type">차트 타입</Label>
                <Select
                  value={chartConfig.type}
                  onValueChange={(value: ChartConfig['type']) => {
                    const newConfig = { ...chartConfig, type: value };
                    setChartConfig(newConfig);
                    saveChartConfig(newConfig);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">선 그래프</SelectItem>
                    <SelectItem value="area">영역 그래프</SelectItem>
                    <SelectItem value="bar">막대 그래프</SelectItem>
                    <SelectItem value="pie">파이 차트</SelectItem>
                    <SelectItem value="scatter">산점도</SelectItem>
                    <SelectItem value="composed">복합 차트</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="chart-title">차트 제목</Label>
                <Input
                  id="chart-title"
                  value={chartConfig.title}
                  onChange={(e) => {
                    const newConfig = { ...chartConfig, title: e.target.value };
                    setChartConfig(newConfig);
                    saveChartConfig(newConfig);
                  }}
                  placeholder="차트 제목을 입력하세요"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="x-axis">X축 데이터 키</Label>
                <Input
                  id="x-axis"
                  value={chartConfig.xAxis}
                  onChange={(e) => {
                    const newConfig = { ...chartConfig, xAxis: e.target.value };
                    setChartConfig(newConfig);
                    saveChartConfig(newConfig);
                  }}
                  placeholder="x축 데이터 키"
                />
              </div>
              <div>
                <Label htmlFor="y-axis">Y축 데이터 키</Label>
                <Input
                  id="y-axis"
                  value={chartConfig.yAxis}
                  onChange={(e) => {
                    const newConfig = { ...chartConfig, yAxis: e.target.value };
                    setChartConfig(newConfig);
                    saveChartConfig(newConfig);
                  }}
                  placeholder="y축 데이터 키"
                />
              </div>
            </div>

            <Separator />

            <div>
              <Label htmlFor="data-input">데이터 입력 (CSV 형식)</Label>
              <Textarea
                id="data-input"
                value={dataInput}
                onChange={(e) => setDataInput(e.target.value)}
                placeholder="헤더,값1,값2&#10;1월,400,300&#10;2월,300,400&#10;3월,200,500"
                rows={4}
              />
              <Button
                className="mt-2"
                onClick={() => parseDataInput(dataInput)}
                size="sm"
              >
                데이터 적용
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Chart Display */}
      <Card>
        <CardHeader>
          <CardTitle>{chartConfig.title}</CardTitle>
        </CardHeader>
        <CardContent>{renderChart()}</CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>데이터 테이블</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border">
              <thead className="bg-muted/50">
                <tr>
                  {chartConfig.data.length > 0 &&
                    Object.keys(chartConfig.data[0]).map((key) => (
                      <th
                        key={`header-${key}`}
                        className="px-4 py-2 text-left font-semibold text-sm border border-border"
                      >
                        {key}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {chartConfig.data.map((row, index) => (
                  <tr
                    key={`row-${row.name}-${index}`}
                    className="border-b border-border"
                  >
                    {Object.values(row).map((value, valueIndex) => (
                      <td
                        key={`cell-${row.name}-${valueIndex}`}
                        className="px-4 py-2 text-sm border border-border"
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
