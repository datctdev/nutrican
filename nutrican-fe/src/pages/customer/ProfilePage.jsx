import { useState, useEffect, useRef } from 'react';
import { userService } from '../../services/userService';
import Card from '../../components/ui/card';
import Input from '../../components/ui/input';
import Label from '../../components/ui/label';
import Button from '../../components/ui/button';
import { Avatar } from '../../components/common/Avatar';
import { toast } from 'sonner';
import { Loader2, Upload } from 'lucide-react';

export default function ProfilePage() {
  const fileInputRef = useRef(null);
  
  // Profile state
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    address: '',
    avatarUrl: '',
  });
  
  // Macro targets state
  const [macros, setMacros] = useState({
    dailyCalories: 2000,
    protein: 120,
    carb: 200,
    fat: 65,
  });
  
  // Loading states
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingMacros, setIsLoadingMacros] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingMacros, setIsSavingMacros] = useState(false);
  
  // Error states
  const [profileError, setProfileError] = useState('');
  const [macroError, setMacroError] = useState('');

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  // Fetch macro targets on mount
  useEffect(() => {
    fetchMacros();
  }, []);

  const fetchProfile = async () => {
    setIsLoadingProfile(true);
    setProfileError('');
    try {
      const response = await userService.getProfile();
      const data = response.data.data;
      setProfile({
        fullName: data.fullName || '',
        email: data.email || '',
        phoneNumber: data.phoneNumber || '',
        address: data.address || '',
        avatarUrl: data.avatarUrl || '',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfileError('Failed to load profile. Please try again.');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const fetchMacros = async () => {
    setIsLoadingMacros(true);
    setMacroError('');
    try {
      const response = await userService.getMacroTarget();
      const data = response.data.data;
      setMacros({
        dailyCalories: data.dailyCalories || 2000,
        protein: data.protein || 120,
        carb: data.carb || 200,
        fat: data.fat || 65,
      });
    } catch (error) {
      console.error('Error fetching macros:', error);
      setMacroError('Failed to load macro targets. Please try again.');
    } finally {
      setIsLoadingMacros(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (500KB max)
    if (file.size > 500 * 1024) {
      toast.error('Image size must be less than 500KB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await userService.uploadAvatar(formData);
      const newAvatarUrl = response.data.data;
      
      setProfile(prev => ({ ...prev, avatarUrl: newAvatarUrl }));
      toast.success('Avatar updated successfully!');
      
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error(error.response?.data?.message || 'Failed to upload avatar. Please try again.');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleMacroChange = (e) => {
    const { name, value } = e.target;
    setMacros(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setProfileError('');
    try {
      const response = await userService.updateProfile({
        fullName: profile.fullName,
        phoneNumber: profile.phoneNumber,
        address: profile.address,
      });
      
      // Update auth store with new user data
      setUser({ ...user, ...response.data.data });
      
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMsg = error.response?.data?.message || 'Failed to update profile. Please try again.';
      setProfileError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveMacros = async () => {
    setIsSavingMacros(true);
    setMacroError('');
    try {
      await userService.setMacroTarget({
        dailyCalories: macros.dailyCalories,
        protein: macros.protein,
        carb: macros.carb,
        fat: macros.fat,
      });
      
      toast.success('Macro targets updated successfully!');
    } catch (error) {
      console.error('Error updating macros:', error);
      const errorMsg = error.response?.data?.message || 'Failed to update macro targets. Please try again.';
      setMacroError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSavingMacros(false);
    }
  };

  // Get initials for avatar fallback
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoadingProfile && isLoadingMacros) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Personal Information</h3>
          
          {/* Avatar Section */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <Avatar 
                src={profile.avatarUrl} 
                alt={profile.fullName || 'User'}
                size="xl" 
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={handleAvatarClick}
              />
              
              {/* Upload overlay */}
              {isUploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              )}
              
              {/* Camera icon overlay */}
              {!isUploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 hover:opacity-100 transition-opacity">
                  <Upload className="h-5 w-5 text-white" />
                </div>
              )}
            </div>
            
            <div>
              <p className="font-medium text-gray-900">{profile.fullName || 'User'}</p>
              <button 
                onClick={handleAvatarClick}
                className="text-sm text-blue-600 hover:text-blue-700"
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? 'Uploading...' : 'Change Avatar'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <p className="text-xs text-gray-500 mt-1">Max size: 500KB (JPG, PNG)</p>
            </div>
          </div>
          
          {/* Profile Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                value={profile.fullName}
                onChange={handleProfileChange}
                placeholder="Enter your full name"
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={profile.email}
                disabled
                className="bg-gray-100 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>
            
            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                value={profile.phoneNumber}
                onChange={handleProfileChange}
                placeholder="Enter your phone number"
              />
            </div>
            
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                value={profile.address}
                onChange={handleProfileChange}
                placeholder="Enter your address"
              />
            </div>
            
            {profileError && (
              <p className="text-sm text-red-600">{profileError}</p>
            )}
            
            <Button 
              onClick={handleSaveProfile} 
              disabled={isSavingProfile}
              className="w-full"
            >
              {isSavingProfile ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </Card>
        
        {/* Macro Targets Card */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Daily Macro Targets</h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="dailyCalories">Daily Calories (kcal)</Label>
              <Input
                id="dailyCalories"
                name="dailyCalories"
                type="number"
                min="0"
                value={macros.dailyCalories}
                onChange={handleMacroChange}
                placeholder="2000"
              />
            </div>
            
            <div>
              <Label htmlFor="protein">Protein (g)</Label>
              <Input
                id="protein"
                name="protein"
                type="number"
                min="0"
                value={macros.protein}
                onChange={handleMacroChange}
                placeholder="120"
              />
            </div>
            
            <div>
              <Label htmlFor="carb">Carbohydrates (g)</Label>
              <Input
                id="carb"
                name="carb"
                type="number"
                min="0"
                value={macros.carb}
                onChange={handleMacroChange}
                placeholder="200"
              />
            </div>
            
            <div>
              <Label htmlFor="fat">Fat (g)</Label>
              <Input
                id="fat"
                name="fat"
                type="number"
                min="0"
                value={macros.fat}
                onChange={handleMacroChange}
                placeholder="65"
              />
            </div>
            
            {macroError && (
              <p className="text-sm text-red-600">{macroError}</p>
            )}
            
            <Button 
              onClick={handleSaveMacros} 
              disabled={isSavingMacros}
              className="w-full"
            >
              {isSavingMacros ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Update Targets'
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
