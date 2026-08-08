import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Users, Calendar, Activity, TrendingUp, Clock, ClipboardList } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, Cell
} from 'recharts';

export default function Dashboard() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardService.getDashboardSummary(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-48 mb-8"></div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-3 w-full">
                  <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                  <div className="h-8 bg-slate-100 rounded w-1/3"></div>
                </div>
                <div className="w-12 h-12 bg-slate-100 rounded-xl"></div>
              </div>
            </div>
          ))}
        </div>
        <div className="h-96 bg-white rounded-2xl shadow-sm border border-slate-100 mt-6"></div>
      </div>
    );
  }

  // Ensure data structure safely
  const rawData = dashboardData?.data || dashboardData;
  const summary = rawData?.summary || {
    total_pasien: 0,
    total_fisioterapi: 0,
    total_appointment: 0,
    appointment_hari_ini: 0,
  };

  const patientChartData = rawData?.charts?.patients || [
    { month: 'Jan', total: 12 }, { month: 'Feb', total: 19 },
    { month: 'Mar', total: 15 }, { month: 'Apr', total: 22 },
    { month: 'May', total: 28 }, { month: 'Jun', total: 34 }
  ];

  const appointmentStatusData = rawData?.charts?.appointments || [
    { name: 'Selesai', value: 45 },
    { name: 'Scheduled', value: 25 },
    { name: 'Dibatalkan', value: 5 }
  ];

  const stats = [
    {
      title: 'Total Data Pasien',
      value: summary.total_pasien,
      trend: '+12%',
      trendUp: true,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      title: 'Aktif Therapists',
      value: summary.total_fisioterapi,
      trend: 'Steady',
      trendUp: true,
      icon: Activity,
      color: 'text-teal-600',
      bgColor: 'bg-teal-500/10'
    },
    {
      title: 'Total Data Janji Terapi',
      value: summary.total_appointment,
      trend: '+5%',
      trendUp: true,
      icon: Calendar,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-500/10'
    },
    {
      title: "Hari Ini's Schedule",
      value: summary.appointment_hari_ini,
      trend: '2 pending',
      trendUp: false,
      icon: Clock,
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10'
    }
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f43f5e', '#f59e0b'];

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Overview</h1>
        <p className="text-slate-500 mt-1">Here's what's happening at your clinic today.</p>
      </div>
      
      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="overflow-hidden border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">{stat.title}</p>
                  <h3 className="text-3xl font-bold text-slate-900 mt-2 tracking-tight">{stat.value}</h3>
                  <div className="flex items-center mt-2 gap-1.5">
                    {stat.trendUp ? (
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <TrendingUp className="w-3.5 h-3.5 text-slate-400 rotate-180" />
                    )}
                    <span className={`text-xs font-medium ${stat.trendUp ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {stat.trend}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">vs last month</span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor} shadow-inner`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Area */}
        <Card className="col-span-1 lg:col-span-2 border-slate-100 shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-slate-800">Patient Growth</CardTitle>
            <CardDescription>Monthly new patient registration over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={patientChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12}} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12}} 
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Secondary Info Area */}
        <div className="space-y-6 flex flex-col">
          <Card className="border-slate-100 shadow-sm rounded-2xl flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-slate-800">Appointment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[180px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={appointmentStatusData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} width={80} />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                      {appointmentStatusData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-100 shadow-sm rounded-2xl flex-1 bg-primary text-white">
            <CardContent className="p-6 flex flex-col justify-center h-full">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <ClipboardList className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Generate Weekly Report</h3>
              <p className="text-primary-foreground/80 text-sm mb-4">
                Download a comprehensive summary of all clinic activities.
              </p>
              <button className="bg-white text-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors self-start shadow-sm">
                Download PDF
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
