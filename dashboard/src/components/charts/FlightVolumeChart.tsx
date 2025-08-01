'use client';

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { format } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface FlightVolumeChartProps {
  data: {
    date: string;
    arrivals: number;
    departures: number;
  }[];
  title?: string;
}

export function FlightVolumeChart({ data, title = 'Flight Volume by Day' }: FlightVolumeChartProps) {
  const chartData = {
    labels: data.map(d => format(new Date(d.date), 'MMM dd')),
    datasets: [
      {
        label: 'Arrivals',
        data: data.map(d => d.arrivals),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
      },
      {
        label: 'Departures',
        data: data.map(d => d.departures),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
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
      x: {
        stacked: false,
      },
      y: {
        stacked: false,
        title: {
          display: true,
          text: 'Number of Flights',
        },
      },
    },
  };

  return <Bar options={options} data={chartData} />;
}