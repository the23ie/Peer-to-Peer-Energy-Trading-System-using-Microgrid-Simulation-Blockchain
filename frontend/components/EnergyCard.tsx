import { Zap, TrendingUp, TrendingDown } from 'lucide-react';

interface EnergyCardProps {
  title: string;
  value: string;
  unit: string;
  icon: 'zap' | 'up' | 'down';
  gradient?: 'primary' | 'secondary' | 'teal' | 'aqua';
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export default function EnergyCard({
  title,
  value,
  unit,
  icon,
  gradient = 'primary',
  trend,
}: EnergyCardProps) {
  const gradients = {
    primary: 'bg-gradient-primary',
    secondary: 'bg-gradient-secondary',
    teal: 'bg-accent-teal/20',
    aqua: 'bg-accent-aqua/20',
  };

  const iconColors = {
    primary: 'text-white',
    secondary: 'text-white',
    teal: 'text-accent-teal',
    aqua: 'text-accent-aqua',
  };

  const IconComponent = {
    zap: Zap,
    up: TrendingUp,
    down: TrendingDown,
  }[icon];

  return (
    <div className="card hover:shadow-xl transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm text-primary-600 mb-2">{title}</p>
          <div className="flex items-baseline space-x-2">
            <p className="text-3xl font-bold text-primary-800">{value}</p>
            <span className="text-sm text-primary-600">{unit}</span>
          </div>
        </div>
        <div className={`p-3 ${gradients[gradient]} rounded-xl flex-shrink-0`}>
          <IconComponent className={`w-6 h-6 ${iconColors[gradient]}`} />
        </div>
      </div>

      {trend && (
        <div className="flex items-center space-x-1 text-sm">
          {trend.isPositive ? (
            <>
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-green-600 font-medium">+{trend.value}%</span>
            </>
          ) : (
            <>
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-red-600 font-medium">{trend.value}%</span>
            </>
          )}
          <span className="text-primary-500">vs last month</span>
        </div>
      )}
    </div>
  );
}