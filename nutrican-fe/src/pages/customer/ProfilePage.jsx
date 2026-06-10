// src/pages/customer/ProfilePage.jsx
import { useState, useEffect, useRef } from 'react';
import { userService } from '../../services/userService';
<<<<<<< HEAD
import { useAuthStore } from '../../stores/authStore';
import Card from '../../components/ui/card';
import Input from '../../components/ui/input';
import Label from '../../components/ui/label';
import Button from '../../components/ui/button';
import { Avatar } from '../../components/common/Avatar';
=======
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
>>>>>>> feature/premium-ui-revamp
import { toast } from 'sonner';
import { Loader2, Upload, User, Mail, Phone, MapPin, Target, Flame, Beef, Wheat, Droplet } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const fileInputRef = useRef(null);
  const { user: authUser, setUser: setAuthUser } = useAuthStore();
  
  const [profile, setProfile] = useState({ fullName: '', email: '', phoneNumber: '', address: '', avatarUrl: '' });
  const [macros, setMacros] = useState({ dailyCalories: 2000, protein: 120, carb: 200, fat: 65 });
  
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingMacros, setIsLoadingMacros] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingMacros, setIsSavingMacros] = useState(false);

  useEffect(() => { fetchProfile(); fetchMacros(); }, []);

  const fetchProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const response = await userService.getProfile();
      const data = response.data.data;
      setProfile({
        fullName: data.fullName || '', email: data.email || '',
        phoneNumber: data.phoneNumber || '', address: data.address || '',
        avatarUrl: data.avatarUrl || '',
      });
    } catch (error) { toast.error('Failed to load profile'); } 
    finally { setIsLoadingProfile(false); }
  };

  const fetchMacros = async () => {
    setIsLoadingMacros(true);
    try {
      const response = await userService.getMacroTarget();
      const data = response.data.data;
      setMacros({
        dailyCalories: data.dailyCalories || 2000, protein: data.protein || 120,
        carb: data.carb || 200, fat: data.fat || 65,
      });
    } catch (error) { toast.error('Failed to load macro targets'); } 
    finally { setIsLoadingMacros(false); }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please select an image file');
    if (file.size > 500 * 1024) return toast.error('Image size must be less than 500KB');

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
        fullName: profile.fullName, phoneNumber: profile.phoneNumber, address: profile.address,
      });
      setAuthUser({ ...authUser, ...response.data.data });
      toast.success('Profile updated successfully!');
    } catch (error) { toast.error('Failed to update profile'); } 
    finally { setIsSavingProfile(false); }
  };

  const handleSaveMacros = async () => {
    setIsSavingMacros(true);
    try {
      await userService.setMacroTarget(macros);
      toast.success('Macro targets updated successfully!');
    } catch (error) { toast.error('Failed to update macro targets'); } 
    finally { setIsSavingMacros(false); }
  };

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

  if (isLoadingProfile && isLoadingMacros) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  // Sửa lỗi InputField: Xóa class ghi đè padding, đảm bảo pl-10 (40px) để không bị đè Icon
  const InputField = ({ icon: Icon, label, className = "", ...props }) => (
    <div className="space-y-1.5 w-full">
      <label className="text-sm font-bold text-slate-700">{label}</label>
      <div className="relative flex items-center">
        {Icon && <Icon className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />}
        <input 
          className={`w-full py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-500 ${Icon ? 'pl-9 pr-3' : 'px-4'} ${className}`} 
          {...props} 
        />
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Account Settings</h1>
        <p className="text-slate-500 mt-1 font-medium">Manage your personal information and nutrition targets.</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column: Personal Info */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-8">
              <h3 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Personal Details</h3>
              
              {/* Avatar Section */}
              <div className="flex items-center gap-6 mb-8">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-blue-500 to-indigo-500">
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt={profile.fullName} className="w-full h-full rounded-full object-cover border-2 border-white" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-blue-600 font-bold text-2xl border-2 border-white">
                        {getInitials(profile.fullName)}
                      </div>
                    )}
                  </div>
                  <div className={`absolute inset-0 rounded-full flex items-center justify-center transition-all ${isUploadingAvatar ? 'bg-black/40' : 'bg-black/40 opacity-0 group-hover:opacity-100'}`}>
                    {isUploadingAvatar ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Upload className="w-6 h-6 text-white" />}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-800">{profile.fullName || 'Member'}</h4>
                  <p className="text-sm text-slate-500 font-medium mb-2">Update your profile picture</p>
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploadingAvatar} className="rounded-lg border-slate-200 h-8">
                    {isUploadingAvatar ? 'Uploading...' : 'Choose image'}
                  </Button>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-5">
                <InputField icon={User} label="Full Name" value={profile.fullName} onChange={(e) => setProfile(p => ({...p, fullName: e.target.value}))} placeholder="Enter your full name" />
                <InputField icon={Mail} label="Email Address" type="email" value={profile.email} disabled />
                <InputField icon={Phone} label="Phone Number" value={profile.phoneNumber} onChange={(e) => setProfile(p => ({...p, phoneNumber: e.target.value}))} placeholder="e.g. +84 123 456 789" />
                <InputField icon={MapPin} label="Address" value={profile.address} onChange={(e) => setProfile(p => ({...p, address: e.target.value}))} placeholder="Enter your physical address" />
                
                <div className="pt-4 flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={isSavingProfile} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 shadow-sm">
                    {isSavingProfile ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Macro Targets */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-800 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />
            <CardContent className="p-8 relative z-10">
              <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
                <Target className="w-6 h-6 text-blue-400" />
                <h3 className="text-xl font-bold text-white">Daily Macro Targets</h3>
              </div>

              <div className="space-y-6">
                <InputField 
                  icon={Flame} 
                  label={<span className="text-slate-300">Calories (kcal)</span>} 
                  type="number" 
                  value={macros.dailyCalories} 
                  onChange={(e) => setMacros(m => ({...m, dailyCalories: Number(e.target.value)}))} 
                  className="bg-white/10 border-white/10 text-white placeholder-white/40 focus:ring-blue-500/40 focus:border-blue-400" 
                />
                
                <div className="grid grid-cols-3 gap-3">
                  <InputField 
                    icon={Beef} 
                    label={<span className="text-slate-300 text-xs">Protein (g)</span>} 
                    type="number" 
                    value={macros.protein} 
                    onChange={(e) => setMacros(m => ({...m, protein: Number(e.target.value)}))} 
                    className="bg-white/10 border-white/10 text-white focus:border-blue-400 text-sm" 
                  />
                  <InputField 
                    icon={Wheat} 
                    label={<span className="text-slate-300 text-xs">Carbs (g)</span>} 
                    type="number" 
                    value={macros.carb} 
                    onChange={(e) => setMacros(m => ({...m, carb: Number(e.target.value)}))} 
                    className="bg-white/10 border-white/10 text-white focus:border-blue-400 text-sm" 
                  />
                  <InputField 
                    icon={Droplet} 
                    label={<span className="text-slate-300 text-xs">Fat (g)</span>} 
                    type="number" 
                    value={macros.fat} 
                    onChange={(e) => setMacros(m => ({...m, fat: Number(e.target.value)}))} 
                    className="bg-white/10 border-white/10 text-white focus:border-blue-400 text-sm" 
                  />
                </div>
                
                <div className="pt-6">
                  <Button onClick={handleSaveMacros} disabled={isSavingMacros} className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-md border-0 py-6 text-base">
                    {isSavingMacros ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Updating...</> : 'Update Targets'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}