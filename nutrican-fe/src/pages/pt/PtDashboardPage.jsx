import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Avatar from '../../components/common/Avatar';

export default function PtDashboardPage() {
  const clients = [
    { id: 1, name: 'Alice Smith', status: 'GREEN', lastLog: '2 hours ago', avgCalories: 1800 },
    { id: 2, name: 'Bob Johnson', status: 'RED', lastLog: 'Overdue', avgCalories: 2500 },
    { id: 3, name: 'Charlie Lee', status: 'YELLOW', lastLog: 'Yesterday', avgCalories: 1600 },
  ];

  const statusColors = { GREEN: 'bg-green-500', RED: 'bg-red-500', YELLOW: 'bg-yellow-500' };
  const statusLabels = { GREEN: 'On Track', RED: 'Over Calorie', YELLOW: 'Missing Log' };
  const statusBadge = { GREEN: 'success', RED: 'danger', YELLOW: 'warning' };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">PT Dashboard</h1>
        <Link to="/pt/reviews" className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200">
          Pending Reviews (3)
        </Link>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Clients', value: '12' },
          { label: 'Pending Reviews', value: '3' },
          { label: 'SOS Tickets', value: '1' },
          { label: 'This Week Reviews', value: '28' },
        ].map((stat) => (
          <Card key={stat.label} className="p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>
      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">My Clients</h3>
        <div className="space-y-3">
          {clients.map((client) => (
            <div key={client.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${statusColors[client.status]} animate-pulse`} />
                <Avatar alt={client.name} size="sm" />
                <div>
                  <p className="font-medium text-gray-900">{client.name}</p>
                  <p className="text-sm text-gray-500">Last log: {client.lastLog}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">{client.avgCalories} kcal avg</span>
                <Badge variant={statusBadge[client.status]}>{statusLabels[client.status]}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
