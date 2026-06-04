import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import { useState } from 'react';
import { Menu, X, ChevronDown, Bell, LogOut, User, Settings, LayoutDashboard } from 'lucide-react';

export default function Header() {
  const { user, logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out', { description: 'See you again!' });
    navigate('/login');
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'ADMIN': return '/admin';
      case 'PT_CERTIFIED':
      case 'PT_FREELANCE': return '/pt';
      default: return '/diet';
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const navItems = {
    CUSTOMER: [
      { label: 'Diet Tracker', href: '/diet' },
      { label: 'Find PT', href: '/marketplace' },
      { label: 'KYC', href: '/kyc' },
      { label: 'Profile', href: '/profile' },
    ],
    PT_CERTIFIED: [
      { label: 'Dashboard', href: '/pt' },
      { label: 'Clients', href: '/pt/clients' },
      { label: 'Reviews', href: '/pt/reviews' },
    ],
    PT_FREELANCE: [
      { label: 'Dashboard', href: '/pt' },
      { label: 'Clients', href: '/pt/clients' },
      { label: 'Reviews', href: '/pt/reviews' },
    ],
    ADMIN: [
      { label: 'Dashboard', href: '/admin' },
      { label: 'PT Management', href: '/admin/pts' },
      { label: 'KYC', href: '/admin/kyc' },
      { label: 'Users', href: '/admin/users' },
      { label: 'SOS', href: '/admin/sos' },
    ],
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <span className="font-bold text-xl text-gray-900">Nutrican</span>
            </Link>

            {/* Desktop Navigation */}
            {isAuthenticated && user && (
              <nav className="hidden md:flex items-center gap-1">
                {navItems[user.role]?.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                </button>

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.fullName || 'User'}
                        className="h-8 w-8 rounded-full object-cover"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
                        {getInitials(user?.fullName)}
                      </div>
                    )}
                    <div className="hidden lg:block text-left">
                      <p className="text-sm font-medium text-gray-900">{user?.fullName}</p>
                      <p className="text-xs text-gray-500 capitalize">{user?.role?.toLowerCase().replace('_', ' ')}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>

                  {/* Dropdown Menu */}
                  {profileMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border py-2 z-50 animate-scale-in">
                        <div className="px-4 py-3 border-b">
                          <p className="text-sm font-medium">{user?.fullName}</p>
                          <p className="text-xs text-gray-500">{user?.email}</p>
                        </div>
                        <div className="py-2">
                          <Link
                            to={getDashboardLink()}
                            className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                            onClick={() => setProfileMenuOpen(false)}
                          >
                            <LayoutDashboard className="w-4 h-4 text-gray-400" />
                            Dashboard
                          </Link>
                          <Link
                            to="/profile"
                            className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                            onClick={() => setProfileMenuOpen(false)}
                          >
                            <User className="w-4 h-4 text-gray-400" />
                            Profile
                          </Link>
                          <Link
                            to="/settings"
                            className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                            onClick={() => setProfileMenuOpen(false)}
                          >
                            <Settings className="w-4 h-4 text-gray-400" />
                            Settings
                          </Link>
                        </div>
                        <div className="border-t pt-2 pb-2">
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            Log out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && isAuthenticated && user && (
          <div className="md:hidden border-t py-4 animate-slide-in">
            <nav className="flex flex-col gap-1">
              {navItems[user.role]?.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
