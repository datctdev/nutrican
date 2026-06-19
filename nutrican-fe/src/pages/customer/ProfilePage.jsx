// src/pages/customer/ProfilePage.jsx
import { useState, useEffect, useRef } from 'react';
import { userService } from '../../services/userService';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import Modal from '../../components/common/Modal';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Loader2, Camera, User, Mail, Phone, MapPin, Target, ChevronRight, Edit3, Camera as CameraIcon } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export default function ProfilePage() {
  const { user: authUser, setUser: setAuthUser } = useAuthStore();
  const fileInputRef = useRef(null);
  
  const [profile, setProfile] = useState({ fullName: '', email: '', phoneNumber: '', address: '', avatarUrl: '' });
  const [editForm, setEditForm] = useState({ fullName: '', phoneNumber: '', address: '' });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const response = await userService.getProfile();
      const data = response.data.data;
      const p = {
        fullName: data.fullName || '', email: data.email || '',
        phoneNumber: data.phoneNumber || '', address: data.address || '',
        avatarUrl: data.avatarUrl || '',
      };
      setProfile(p);
      setEditForm({ fullName: p.fullName, phoneNumber: p.phoneNumber, address: p.address });
    } catch (error) { toast.error('Failed to load profile'); } 
    finally { setIsLoadingProfile(false); }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please select an image file');
    if (file.size > 5 * 1024 * 1024) return toast.error('Image size must be less than 5MB');

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await userService.uploadAvatar(formData);
      const newAvatarUrl = response.data.data;
      setProfile(prev => ({ ...prev, avatarUrl: newAvatarUrl }));
      setAuthUser({ ...authUser, avatarUrl: newAvatarUrl });
      toast.success('Avatar updated successfully!');
    } catch (error) {
      toast.error('Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const response = await userService.updateProfile({
        fullName: editForm.fullName, phoneNumber: editForm.phoneNumber, address: editForm.address,
      });
      setAuthUser({ ...authUser, ...response.data.data });
      setProfile(prev => ({ ...prev, ...editForm }));
      toast.success('Profile updated successfully!');
      setIsEditModalOpen(false);
    } catch (error) { toast.error('Failed to update profile'); } 
    finally { setIsSavingProfile(false); }
  };

  const openEditModal = () => {
    setEditForm({ fullName: profile.fullName, phoneNumber: profile.phoneNumber, address: profile.address });
    setIsEditModalOpen(true);
  };

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

  if (isLoadingProfile) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto pb-12 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Profile</h1>
        <p className="text-slate-500 mt-1 font-medium">View and manage your personal information.</p>
      </div>

      {/* Profile Card */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
        {/* Cover gradient */}
        <div className="h-32 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        
        <CardContent className="px-8 pb-8">
          {/* Avatar */}
          <div className="flex items-end justify-between -mt-16 mb-6">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full p-1.5 bg-white shadow-lg">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.fullName} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 font-bold text-4xl">
                    {getInitials(profile.fullName)}
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg transition-colors disabled:opacity-50"
              >
                {isUploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </div>
          </div>

          {/* Name & email */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">{profile.fullName || 'Member'}</h2>
            <p className="text-slate-500 mt-1">{profile.email}</p>
          </div>

          {/* Info rows */}
          <div className="space-y-1">
            <div className="flex items-center justify-between py-4 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Full Name</p>
                  <p className="text-slate-900 font-medium mt-0.5">{profile.fullName || '—'}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between py-4 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</p>
                  <p className="text-slate-900 font-medium mt-0.5">{profile.email || '—'}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between py-4 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone Number</p>
                  <p className="text-slate-900 font-medium mt-0.5">{profile.phoneNumber || 'Not set'}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Address</p>
                  <p className="text-slate-900 font-medium mt-0.5">{profile.address || 'Not set'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <Button onClick={openEditModal} className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-6 font-semibold flex items-center justify-center gap-2">
              <Edit3 className="w-4 h-4" />
              Edit Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Profile">
        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={editForm.fullName}
                onChange={(e) => setEditForm(f => ({...f, fullName: e.target.value}))}
                placeholder="Enter your full name"
                className="w-full py-2.5 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={editForm.phoneNumber}
                onChange={(e) => setEditForm(f => ({...f, phoneNumber: e.target.value}))}
                placeholder="e.g. +84 123 456 789"
                className="w-full py-2.5 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <textarea
                value={editForm.address}
                onChange={(e) => setEditForm(f => ({...f, address: e.target.value}))}
                placeholder="Enter your address"
                rows={3}
                className="w-full py-2.5 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="flex-1 rounded-xl py-5">
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={isSavingProfile} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-5">
              {isSavingProfile ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
