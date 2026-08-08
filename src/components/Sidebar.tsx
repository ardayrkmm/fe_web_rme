import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuthStore } from '../store/useAuthStore';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  X,
  Stethoscope,
  Activity,
  Dumbbell,
  ClipboardList,
  FileBarChart,
  Settings,
  Layers,
  Banknote
} from 'lucide-react';

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const navigation = [
  { name: 'Beranda', href: '/dashboard', icon: LayoutDashboard, allowedRoles: ['admin', 'owner', 'fisioterapis'] },
  { name: 'Data Pasien', href: '/patients', icon: Users, allowedRoles: ['admin', 'owner'] },
  { name: 'Fisioterapis', href: '/physiotherapists', icon: Stethoscope, allowedRoles: ['admin', 'owner'] },
  { name: 'Data Layanan (Layanan)', href: '/services', icon: Layers, allowedRoles: ['admin', 'owner'] },
  { name: 'Data Janji Terapi', href: '/appointments', icon: Calendar, allowedRoles: ['admin', 'owner'] },
  { name: 'Sesi Terapi', href: '/therapy-sessions', icon: Activity, allowedRoles: ['admin', 'owner', 'fisioterapis'] },
  { name: 'Rekam Medis', href: '/medical-records', icon: ClipboardList, allowedRoles: ['admin', 'owner', 'fisioterapis'] },
  { name: 'Pembayaran', href: '/payments', icon: Banknote, allowedRoles: ['admin', 'owner'] },
];

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuthStore();
  const userRole = user?.role || 'admin';
  const filteredNavigation = navigation.filter(item => item.allowedRoles.includes(userRole));

  return (
    <>
      {/* Mobile overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-all duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )} 
        onClick={() => setOpen(false)}
      />

      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col shadow-sm",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Arummy<span className="text-primary"> Fisioterapi</span></span>
          </Link>
          <button 
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors" 
            onClick={() => setOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Menu Utama</p>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <div key={item.name} className="relative group mb-1">
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group-hover:bg-slate-50",
                    isActive 
                      ? "bg-primary/10 text-primary hover:bg-primary/15" 
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5 transition-colors duration-200", 
                    isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
                  )} />
                  {item.name}
                  {isActive && (
                    <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </Link>
              </div>
            )
          })}
        </nav>
        
        
        {userRole === 'admin' && (
          <div className="p-4 border-t border-slate-100">
            <Link
              to="/settings"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all duration-200"
            >
              <Settings className="w-5 h-5 text-slate-400" />
              Pengaturan
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
