import { Badge } from '../ui/Badge';

interface FlightStatusProps {
  status: string;
  className?: string;
}

const statusConfig = {
  scheduled: { label: 'Scheduled', variant: 'default' as const },
  delayed: { label: 'Delayed', variant: 'warning' as const },
  cancelled: { label: 'Cancelled', variant: 'danger' as const },
  landed: { label: 'Landed', variant: 'success' as const },
  departed: { label: 'Departed', variant: 'info' as const },
  boarding: { label: 'Boarding', variant: 'success' as const },
  in_flight: { label: 'In Flight', variant: 'info' as const },
};

export function FlightStatus({ status, className = '' }: FlightStatusProps) {
  const config = statusConfig[status as keyof typeof statusConfig] || {
    label: status,
    variant: 'default' as const,
  };

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}