import { useState } from 'react';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';

export default function ProfilePage() {
  const [profile, setProfile] = useState({ fullName: 'John Doe', email: 'john@example.com', phoneNumber: '+84...', address: '' });
  const [macros, setMacros] = useState({ dailyCalories: 2000, protein: 120, carb: 200, fat: 65 });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Personal Information</h3>
          <div className="flex items-center gap-4 mb-6">
            <Avatar alt="User" size="xl" />
            <Button variant="outline" size="sm">Change Avatar</Button>
          </div>
          <div className="space-y-4">
            <Input label="Full Name" value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} />
            <Input label="Email" value={profile.email} disabled />
            <Input label="Phone" value={profile.phoneNumber} onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })} />
            <Button>Save Changes</Button>
          </div>
        </Card>
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Daily Macro Targets</h3>
          <div className="space-y-4">
            <Input label="Daily Calories" type="number" value={macros.dailyCalories} onChange={(e) => setMacros({ ...macros, dailyCalories: e.target.value })} />
            <Input label="Protein (g)" type="number" value={macros.protein} onChange={(e) => setMacros({ ...macros, protein: e.target.value })} />
            <Input label="Carbs (g)" type="number" value={macros.carb} onChange={(e) => setMacros({ ...macros, carb: e.target.value })} />
            <Input label="Fat (g)" type="number" value={macros.fat} onChange={(e) => setMacros({ ...macros, fat: e.target.value })} />
            <Button>Update Targets</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
