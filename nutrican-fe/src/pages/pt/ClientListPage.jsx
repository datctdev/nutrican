import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Avatar from '../../components/common/Avatar';
import { Link } from 'react-router-dom';

export default function ClientListPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Clients</h1>
      <Card>
        <div className="space-y-3">
          {[
            { name: 'Alice Smith', email: 'alice@example.com', joinedDate: 'Jan 15, 2026', status: 'Active', logs: 45 },
            { name: 'Bob Johnson', email: 'bob@example.com', joinedDate: 'Feb 1, 2026', status: 'Active', logs: 32 },
          ].map((client, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar alt={client.name} />
                <div>
                  <p className="font-medium text-gray-900">{client.name}</p>
                  <p className="text-sm text-gray-500">{client.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{client.logs} logs</p>
                  <p className="text-xs text-gray-500">Joined {client.joinedDate}</p>
                </div>
                <Badge variant="success">{client.status}</Badge>
                <Link to={`/pt/progress/${i + 1}`} className="text-sm text-blue-600 hover:underline">View Progress</Link>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
