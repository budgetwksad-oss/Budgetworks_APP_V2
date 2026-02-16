import { useMemo } from 'react';

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface LineChartProps {
  data: DataPoint[];
  height?: number;
  showLabels?: boolean;
  color?: string;
}

export function LineChart({ data, height = 200, showLabels = true, color = '#3B82F6' }: LineChartProps) {
  const { points, maxValue, minValue } = useMemo(() => {
    if (data.length === 0) return { points: '', maxValue: 0, minValue: 0 };

    const values = data.map(d => d.value);
    const max = Math.max(...values, 0);
    const min = Math.min(...values, 0);
    const range = max - min || 1;

    const width = 100;
    const stepX = width / (data.length - 1 || 1);

    const pointsArray = data.map((d, i) => {
      const x = i * stepX;
      const y = height - ((d.value - min) / range) * (height - 20);
      return `${x},${y}`;
    });

    return {
      points: pointsArray.join(' '),
      maxValue: max,
      minValue: min
    };
  }, [data, height]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        No data available
      </div>
    );
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 100 ${height}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        <polyline
          points={`0,${height} ${points} 100,${height}`}
          fill="url(#lineGradient)"
        />

        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />

        {data.map((d, i) => {
          const x = (i / (data.length - 1 || 1)) * 100;
          const y = height - ((d.value - minValue) / (maxValue - minValue || 1)) * (height - 20);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3"
              fill={color}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>

      {showLabels && (
        <div className="flex justify-between mt-2 text-xs text-gray-600">
          {data.map((d, i) => (
            <span key={i} className="truncate" style={{ maxWidth: `${100 / data.length}%` }}>
              {d.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface BarChartProps {
  data: DataPoint[];
  height?: number;
  showLabels?: boolean;
  showValues?: boolean;
}

export function BarChart({ data, height = 200, showLabels = true, showValues = true }: BarChartProps) {
  const maxValue = useMemo(() => {
    if (data.length === 0) return 0;
    return Math.max(...data.map(d => d.value), 1);
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        No data available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((item, index) => {
        const percentage = (item.value / maxValue) * 100;
        const color = item.color || '#3B82F6';

        return (
          <div key={index} className="space-y-1">
            {showLabels && (
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">{item.label}</span>
                {showValues && (
                  <span className="text-gray-600">{item.value.toLocaleString()}</span>
                )}
              </div>
            )}
            <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: color
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface DonutChartProps {
  data: DataPoint[];
  size?: number;
  thickness?: number;
  showLegend?: boolean;
}

export function DonutChart({ data, size = 200, thickness = 30, showLegend = true }: DonutChartProps) {
  const total = useMemo(() => {
    return data.reduce((sum, d) => sum + d.value, 0);
  }, [data]);

  const segments = useMemo(() => {
    if (total === 0) return [];

    let currentAngle = -90;
    const defaultColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

    return data.map((item, index) => {
      const percentage = (item.value / total) * 100;
      const angle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      currentAngle += angle;

      const radius = (size / 2) - (thickness / 2);
      const center = size / 2;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;

      const pathData = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`
      ].join(' ');

      return {
        path: pathData,
        color: item.color || defaultColors[index % defaultColors.length],
        label: item.label,
        value: item.value,
        percentage
      };
    });
  }, [data, total, size, thickness]);

  if (data.length === 0 || total === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        No data available
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} className="flex-shrink-0">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size / 2) - (thickness / 2)}
          fill="none"
          stroke="#F3F4F6"
          strokeWidth={thickness}
        />

        {segments.map((segment, index) => (
          <path
            key={index}
            d={segment.path}
            fill="none"
            stroke={segment.color}
            strokeWidth={thickness}
            strokeLinecap="round"
            className="transition-all duration-300 hover:opacity-80"
          />
        ))}

        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-2xl font-bold fill-gray-900"
        >
          {total.toLocaleString()}
        </text>
      </svg>

      {showLegend && (
        <div className="space-y-2 flex-1">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-gray-700">{segment.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">
                  {segment.value.toLocaleString()}
                </span>
                <span className="text-gray-500">
                  ({segment.percentage.toFixed(0)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  color?: string;
}

export function StatCard({ label, value, change, icon, color = 'blue' }: StatCardProps) {
  const colorClasses = {
    blue: 'from-blue-50 to-blue-100 border-blue-200',
    green: 'from-green-50 to-green-100 border-green-200',
    orange: 'from-orange-50 to-orange-100 border-orange-200',
    red: 'from-red-50 to-red-100 border-red-200',
    purple: 'from-purple-50 to-purple-100 border-purple-200',
    yellow: 'from-yellow-50 to-yellow-100 border-yellow-200'
  };

  return (
    <div className={`p-6 rounded-xl border bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">{label}</span>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        {change !== undefined && (
          <span className={`text-sm font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
    </div>
  );
}
