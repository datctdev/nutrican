import { useParams } from 'react-router-dom';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';

export default function PtDetailPage() {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-start gap-6">
          <Avatar alt="PT Name" size="xl" />
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Dr. Sarah Johnson</h1>
              <Badge variant="success">Verified</Badge>
              <Badge variant="purple">Tier 1</Badge>
            </div>
            <p className="text-gray-500 mt-1">Certified Nutritionist & Personal Trainer</p>
            <p className="text-yellow-600 mt-2 font-medium">Rating: 4.8/5 (120 reviews)</p>
            <p className="mt-4 text-gray-700">With over 10 years of experience in nutrition and personal training, I help clients achieve their fitness goals through customized meal plans and training programs.</p>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <Button variant="primary">Request Consultation</Button>
          <Button variant="outline">Send Message</Button>
        </div>
      </Card>
      <div className="grid md:grid-cols-2 gap-6">
        <Card><h3 className="font-semibold text-gray-900 mb-3">Specializations</h3><div className="flex flex-wrap gap-2">{['Weight Loss', 'Muscle Building', 'Nutrition Planning'].map(s => <Badge key={s}>{s}</Badge>)}</div></Card>
        <Card><h3 className="font-semibold text-gray-900 mb-3">Certifications</h3><ul className="space-y-1 text-sm text-gray-600">{['NASM Certified Personal Trainer', 'Precision Nutrition Level 1'].map(c => <li key={c}>• {c}</li>)}</ul></Card>
      </div>
    </div>
  );
}
