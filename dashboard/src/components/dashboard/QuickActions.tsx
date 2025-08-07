'use client';

import { Card } from '@/components/ui/Card';
import { 
  Download, 
  FileText, 
  BarChart3, 
  Settings, 
  RefreshCw,
  Bell,
  Database,
  Globe
} from 'lucide-react';
import Link from 'next/link';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
}

export function QuickActions() {
  const actions: QuickAction[] = [
    {
      title: 'Export Data',
      description: 'Download flight data in CSV or JSON',
      icon: Download,
      href: '/export',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      title: 'Generate Report',
      description: 'Create custom analytics report',
      icon: FileText,
      href: '/reports',
      color: 'bg-green-100 text-green-600',
    },
    {
      title: 'View Analytics',
      description: 'Detailed performance metrics',
      icon: BarChart3,
      href: '/metrics',
      color: 'bg-purple-100 text-purple-600',
    },
    {
      title: 'Live Traffic',
      description: 'Real-time flight tracking',
      icon: Globe,
      href: '/live-traffic',
      color: 'bg-indigo-100 text-indigo-600',
    },
    {
      title: 'Historical Data',
      description: 'Browse past flight records',
      icon: Database,
      href: '/historical',
      color: 'bg-yellow-100 text-yellow-600',
    },
    {
      title: 'Notifications',
      description: 'Configure alert preferences',
      icon: Bell,
      href: '/notifications',
      color: 'bg-red-100 text-red-600',
    },
    {
      title: 'Sync Data',
      description: 'Refresh latest flight data',
      icon: RefreshCw,
      href: '#',
      color: 'bg-cyan-100 text-cyan-600',
    },
    {
      title: 'Settings',
      description: 'System configuration',
      icon: Settings,
      href: '/settings',
      color: 'bg-gray-100 text-gray-600',
    },
  ];

  const handleSync = async (e: React.MouseEvent) => {
    e.preventDefault();
    // TODO: Implement data sync
    console.log('Syncing data...');
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {actions.map((action, index) => {
          const Icon = action.icon;
          const isSync = action.title === 'Sync Data';
          
          const content = (
            <>
              <div className={`p-3 rounded-lg ${action.color} mb-3 group-hover:scale-110 transition-transform`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="font-medium text-sm text-gray-900 mb-1">
                {action.title}
              </h3>
              <p className="text-xs text-gray-500">
                {action.description}
              </p>
            </>
          );

          if (isSync) {
            return (
              <button
                key={index}
                onClick={handleSync}
                className="group flex flex-col items-center text-center p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={index}
              href={action.href}
              className="group flex flex-col items-center text-center p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              {content}
            </Link>
          );
        })}
      </div>
    </Card>
  );
}