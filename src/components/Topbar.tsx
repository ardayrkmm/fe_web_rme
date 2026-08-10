import { useState, useRef, useEffect } from 'react';
import { Bell, Menu, User, LogOut, Search } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate, useLocation } from 'react-router-dom';

interface TopbarProps {
  setSidebarOpen: (open: boolean) => void;
}

export default function Topbar({ setSidebarOpen }: TopbarProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setIsProfileOpen(false);
    logout();
    navigate('/login');
  };

  // Generate breadcrumb from path
  const pathnames = location.pathname.split('/').filter((x) => x);
  const breadcrumb = pathnames.length > 0 ? pathnames[0].charAt(0).toUpperCase() + pathnames[0].slice(1).replace('-', ' ') : 'Beranda';

  return (
    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-4 sm:px-8 z-10 sticky top-0">
      <div className="flex items-center gap-4">
        <button 
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors" 
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <h1 className="text-xl font-semibold text-slate-800 hidden sm:block">
          {breadcrumb}
        </h1>
      </div>

      <div className="flex-1 lg:hidden" /> {/* Spacer */}

      <div className="flex items-center gap-5 ml-auto">
        
        {/* Search Bar - Hidden on mobile */}
        <div className="relative hidden md:block w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all sm:text-sm"
            placeholder="Cari di sini..."
          />
        </div>

        <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block" />

        <div className="flex items-center gap-3">
          <div className="flex flex-col text-right hidden sm:flex">
            <span className="text-sm font-semibold text-slate-700">{user?.name || 'Admin User'}</span>
            <span className="text-xs font-medium text-slate-500 capitalize">{user?.role || 'Super Admin'}</span>
          </div>
          
          <div className="relative" ref={profileRef}>
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 w-10 h-10 rounded-full bg-primary/10 justify-center text-primary hover:bg-primary/20 transition-colors focus:outline-none ring-2 ring-primary/30"
            >
              <User className="w-5 h-5" />
            </button>
            
            {/* Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-lg shadow-slate-200/50 py-2 border border-slate-100 z-50 transform origin-top-right transition-all">
                <div className="px-4 py-3 border-b border-slate-100 sm:hidden">
                  <p className="text-sm font-semibold text-slate-900">{user?.name || 'Admin User'}</p>
                  <p className="text-xs font-medium text-slate-500 capitalize mt-0.5">{user?.role || 'Super Admin'}</p>
                </div>
                <div className="px-2 py-1">
                  <button 
                    onClick={handleLogout}
                    className="flex w-full items-center px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Keluar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
