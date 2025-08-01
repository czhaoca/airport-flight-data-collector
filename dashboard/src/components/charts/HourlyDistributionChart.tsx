'use client';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface HourlyDistributionChartProps {
  data: {
    hour: number;
    arrivals: number;
    departures: number;
  }[];
  title?: string;
}

export function HourlyDistributionChart({ 
  data, 
  title = 'Flight Distribution by Hour' 
}: HourlyDistributionChartProps) {
  const chartData = {
    labels: data.map(d => `${d.hour.toString().padStart(2, '0')}:00`),
    datasets: [
      {
        label: 'Arrivals',
        data: data.map(d => d.arrivals),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Departures',
        data: data.map(d => d.departures),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: title,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Flights',
        },
      },
    },
  };

  return <Line options={options} data={chartData} />;
}