'use client';

import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface AirlinePerformanceChartProps {
  data: {
    airline: string;
    onTimePercentage: number;
    flightCount: number;
  }[];
  title?: string;
}

export function AirlinePerformanceChart({ 
  data, 
  title = 'Airline On-Time Performance' 
}: AirlinePerformanceChartProps) {
  const sortedData = [...data].sort((a, b) => b.onTimePercentage - a.onTimePercentage);
  const topAirlines = sortedData.slice(0, 10);

  const chartData = {
    labels: topAirlines.map(d => `${d.airline} (${d.onTimePercentage.toFixed(1)}%)`),
    datasets: [
      {
        data: topAirlines.map(d => d.flightCount),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(6, 182, 212, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(163, 163, 163, 0.8)',
          'rgba(84, 56, 220, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(59, 130, 246)',
          'rgb(251, 191, 36)',
          'rgb(239, 68, 68)',
          'rgb(168, 85, 247)',
          'rgb(236, 72, 153)',
          'rgb(6, 182, 212)',
          'rgb(251, 146, 60)',
          'rgb(163, 163, 163)',
          'rgb(84, 56, 220)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      title: {
        display: true,
        text: title,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} flights (${percentage}% of total)`;
          },
        },
      },
    },
  };

  return <Doughnut options={options} data={chartData} />;
}