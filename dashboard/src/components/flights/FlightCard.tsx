import { format } from 'date-fns';
import { Plane, Clock, MapPin } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { FlightStatus } from './FlightStatus';
import { Flight } from '@/types';

interface FlightCardProps {
  flight: Flight;
  onClick?: () => void;
}

export function FlightCard({ flight, onClick }: FlightCardProps) {
  const scheduledTime = new Date(flight.scheduledTime);
  const actualTime = flight.actualTime ? new Date(flight.actualTime) : null;
  const delay = actualTime && actualTime > scheduledTime
    ? Math.round((actualTime.getTime() - scheduledTime.getTime()) / 60000)
    : 0;

  return (
    <Card className="hover:shadow-lg transition-shadow" onClick={onClick}>
      <CardContent>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-gray-600" />
            <div>
              <p className="font-semibold text-lg">{flight.flightNumber}</p>
              <p className="text-sm text-gray-600">{flight.airline}</p>
            </div>
          </div>
          <FlightStatus status={flight.status} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
              <MapPin className="h-4 w-4" />
              <span>From</span>
            </div>
            <p className="font-medium">{flight.origin.airport}</p>
            {flight.origin.terminal && (
              <p className="text-sm text-gray-600">
                Terminal {flight.origin.terminal}
                {flight.origin.gate && `, Gate ${flight.origin.gate}`}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
              <MapPin className="h-4 w-4" />
              <span>To</span>
            </div>
            <p className="font-medium">{flight.destination.airport}</p>
            {flight.destination.terminal && (
              <p className="text-sm text-gray-600">
                Terminal {flight.destination.terminal}
                {flight.destination.gate && `, Gate ${flight.destination.gate}`}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-600" />
            <div>
              <p className="text-sm text-gray-600">Scheduled</p>
              <p className="font-medium">{format(scheduledTime, 'HH:mm')}</p>
            </div>
          </div>

          {actualTime && (
            <div>
              <p className="text-sm text-gray-600">Actual</p>
              <p className="font-medium">
                {format(actualTime, 'HH:mm')}
                {delay > 0 && (
                  <span className="text-sm text-red-600 ml-2">
                    +{delay} min
                  </span>
                )}
              </p>
            </div>
          )}

          {flight.aircraft && (
            <div className="text-right">
              <p className="text-sm text-gray-600">Aircraft</p>
              <p className="font-medium">
                {typeof flight.aircraft === 'string' 
                  ? flight.aircraft 
                  : flight.aircraft.type}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}