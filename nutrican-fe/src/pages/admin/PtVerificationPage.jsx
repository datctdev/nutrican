import { useState } from 'react';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';

export default function PtVerificationPage() {
  const [pts] = useState([
    { id: 1, name: 'Dr. Sarah Johnson', email: 'sarah@example.com', experience: 10, certifications: 'NASM, ISSA', documents: 'CV, Diploma' },
    { id: 2, name: 'Mike Chen', email: 'mike@example.com', experience: 5, certifications: 'ACSM', documents: 'CV' },
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">PT Verification</h1>
      <div className="space-y-4">
        {pts.map((pt) => (
          <Card key={pt.id}>
            <div className="flex items-start gap-4">
              <Avatar alt={pt.name} size="lg" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">{pt.name}</h3>
                  <Badge variant="warning">Pending</Badge>
                </div>
                <p className="text-sm text-gray-500">{pt.email}</p>
                <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                  <div><span className="text-gray-500">Experience:</span> <span className="font-medium">{pt.experience} years</span></div>
                  <div><span className="text-gray-500">Certifications:</span> <span className="font-medium">{pt.certifications}</span></div>
                  <div><span className="text-gray-500">Documents:</span> <span className="font-medium">{pt.documents}</span></div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="success" size="sm">Approve as Certified PT</Button>
                  <Button variant="outline" size="sm">Approve as Freelance PT</Button>
                  <Button variant="danger" size="sm">Reject</Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
