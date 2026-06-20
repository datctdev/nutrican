import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { toast } from 'sonner';

export default function PtRegistrationPage() {
  const { registerPt, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '', fullName: '', phoneNumber: '', bio: '', trainingPhilosophy: '', yearsOfExperience: '', certifications: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    try {
      await registerPt({ ...formData, yearsOfExperience: parseInt(formData.yearsOfExperience) || 0 });
      toast.success('Registration submitted!', { description: 'Your PT application will be reviewed by admin.' });
      navigate('/login');
    } catch (err) {
      toast.error('Registration failed', { description: err.response?.data?.message || 'Something went wrong' });
    }
  };

  return (
    <Card className="p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Register as PT</h2>
      <p className="text-sm text-gray-500 text-center mb-6">Your account will be reviewed by admin before activation.</p>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Full Name" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} required />
        <Input label="Email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
        <Input label="Password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
        <Input label="Phone" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
          <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" rows="3" value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} />
        </div>
        <Input label="Years of Experience" type="number" value={formData.yearsOfExperience} onChange={(e) => setFormData({ ...formData, yearsOfExperience: e.target.value })} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Certifications</label>
          <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" rows="2" value={formData.certifications} onChange={(e) => setFormData({ ...formData, certifications: e.target.value })} />
        </div>
        <Button type="submit" className="w-full" loading={isLoading}>Submit for Review</Button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600">
        <Link to="/register" className="text-blue-600 hover:underline">Back to regular registration</Link>
      </p>
    </Card>
  );
}
