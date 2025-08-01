'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plane, BarChart3, Map } from 'lucide-react';

export function Navigation() {
  const pathname = usePathname();

  const links = [
    {
      href: '/',
      label: 'Live Flights',
      icon: Plane,
    },
    {
      href: '/historical',
      label: 'Historical Data',
      icon: BarChart3,
    },
    {
      href: '/comparison',
      label: 'Airport Comparison',
      icon: Map,
    },
  ];

  return (
    <nav className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Airport Flight Tracker</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}