import { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Avatar from '../../components/common/Avatar';

export default function MarketplacePage() {
  const [filter, setFilter] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Find Your PT</h1>
        <input
          type="text"
          placeholder="Search by name or specialization..."
          className="px-4 py-2 border border-gray-300 rounded-lg w-80"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { name: 'Dr. Sarah Johnson', bio: 'Certified nutritionist with 10 years experience', tier: 'TIER_1', rating: 4.8, verified: true, specialty: 'Weight Loss' },
          { name: 'Mike Chen', bio: 'Former athlete turned PT. Specializing in muscle building.', tier: 'TIER_2', rating: 4.5, verified: true, specialty: 'Muscle Building' },
          { name: 'Emma Wilson', bio: 'Rehabilitation specialist. Helping clients recover and thrive.', tier: 'TIER_2', rating: 4.9, verified: false, specialty: 'Rehabilitation' },
        ].map((pt, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <Avatar alt={pt.name} size="lg" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{pt.name}</h3>
                  {pt.verified && <Badge variant="success">Verified</Badge>}
                  <Badge variant={pt.tier === 'TIER_1' ? 'purple' : 'info'}>{pt.tier}</Badge>
                </div>
                <p className="text-sm text-gray-500 mt-1">{pt.specialty}</p>
                <p className="text-sm text-gray-600 mt-2">{pt.bio}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm font-medium text-yellow-600">Rating: {pt.rating}/5</span>
                  <Link to={`/pt-profile/${i + 1}`} className="text-sm text-blue-600 hover:underline font-medium">View Profile</Link>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
