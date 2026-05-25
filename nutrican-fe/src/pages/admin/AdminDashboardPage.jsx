import Card from '../../components/common/Card';
import { Link } from 'react-router-dom';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: '1,234' },
          { label: 'Active PTs', value: '89' },
          { label: 'Pending PT Approvals', value: '5' },
          { label: 'SOS Tickets', value: '2' },
        ].map((stat) => (
          <Card key={stat.label} className="p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">Pending PT Approvals</h3>
            <Link to="/admin/pts" className="text-sm text-blue-600 hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {['Dr. Sarah Johnson', 'Mike Chen', 'Emma Wilson'].map((name, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-900">{name}</span>
                <Link to="/admin/pts" className="text-sm text-blue-600 hover:underline">Review</Link>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Recent SOS Tickets</h3>
          <div className="space-y-3">
            {['Alice - Over calorie limit', 'Bob - Cannot estimate meal'].map((ticket, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <span className="text-red-700 font-medium">{ticket}</span>
                <span className="text-xs text-red-500">Urgent</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
