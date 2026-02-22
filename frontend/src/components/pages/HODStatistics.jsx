import {
  PieChart, Pie, Cell,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";

import Sidebar from "../layout/Sidebar";
import Header from "../layout/Header";

import { useEffect, useState } from "react";
import { loadHodStats } from "../../Data/hodStatsDummy.js";

import {
  TrendingUp,
  Users,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  PieChart as PieChartIcon,
  Activity,
  Sparkles,
  Loader2,
} from "lucide-react";

const COLORS = ["#22c55e", "#f59e0b", "#6366f1", "#ef4444"];

export default function HODStatistics() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadHodStats().then(setStats);
  }, []);

  if (!stats) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <Sidebar role="HOD" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-muted-foreground font-medium">Loading statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  const {
    projectStatusData,
    pendingApprovalsData,
    monthlySubmissionsData,
    facultyWorkloadData,
  } = stats;

  // Calculations
  const totalProjects = projectStatusData.reduce((s, i) => s + i.value, 0);
  const approved = projectStatusData.find(i => i.name === "Final Approved")?.value || 0;
  const supervisorPending = pendingApprovalsData.find(i => i.name === "Faculty Pending")?.count || 0;
  const hodPending = pendingApprovalsData.find(i => i.name === "HOD Pending")?.count || 0;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Sidebar role="HOD" />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Department Statistics" />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">

            {/* Welcome Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 sm:p-8 mb-8">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="text-sm font-semibold text-primary">Analytics Dashboard</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                  Department Overview
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Monitor research projects, faculty performance, and submission trends
                </p>
              </div>
              <div className="absolute right-0 top-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
            </div>

            {/* Top Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
              <StatCard 
                title="Total Projects" 
                value={totalProjects}
                icon={FileText}
                gradient="from-primary to-primary/80"
                iconBg="bg-primary/10"
                iconColor="text-primary"
              />
              <StatCard 
                title="Faculty Pending" 
                value={supervisorPending}
                icon={Clock}
                gradient="from-amber-500 to-amber-600"
                iconBg="bg-amber-500/10"
                iconColor="text-amber-600 dark:text-amber-400"
              />
              <StatCard 
                title="HOD Pending" 
                value={hodPending}
                icon={AlertCircle}
                gradient="from-blue-500 to-blue-600"
                iconBg="bg-blue-500/10"
                iconColor="text-blue-600 dark:text-blue-400"
              />
              <StatCard 
                title="Approved" 
                value={approved}
                icon={CheckCircle}
                gradient="from-emerald-500 to-emerald-600"
                iconBg="bg-emerald-500/10"
                iconColor="text-emerald-600 dark:text-emerald-400"
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              
              {/* Project Status Distribution */}
              <Section 
                title="Project Status Distribution" 
                icon={PieChartIcon}
                description="Overview of all research projects by status"
              >
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={projectStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={60}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={true}
                    >
                      {projectStatusData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--card-foreground))'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legend Cards */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {projectStatusData.map((item, index) => (
                    <div 
                      key={item.name}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border"
                    >
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: COLORS[index] }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-card-foreground truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.value} projects
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Faculty Workload */}
              <Section 
                title="Faculty Workload" 
                icon={Users}
                description="Number of projects reviewed by each faculty member"
              >
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={facultyWorkloadData}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8}/>
                        <stop offset="100%" stopColor="#16a34a" stopOpacity={0.6}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="faculty" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      tickLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      tickLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--card-foreground))'
                      }}
                      cursor={{ fill: 'hsl(var(--accent))' }}
                    />
                    <Bar 
                      dataKey="reviewed" 
                      fill="url(#barGradient)" 
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-xs text-muted-foreground mb-1">Total Reviewed</p>
                    <p className="text-lg font-bold text-primary">
                      {facultyWorkloadData.reduce((sum, f) => sum + f.reviewed, 0)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-muted-foreground mb-1">Avg per Faculty</p>
                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                      {Math.round(facultyWorkloadData.reduce((sum, f) => sum + f.reviewed, 0) / facultyWorkloadData.length)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs text-muted-foreground mb-1">Faculty Count</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {facultyWorkloadData.length}
                    </p>
                  </div>
                </div>
              </Section>
            </div>

            {/* Monthly Submissions - Full Width */}
            <Section 
              title="Monthly Submission Trends" 
              icon={Activity}
              description="Research project submissions over the past months"
              fullWidth
            >
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={monthlySubmissionsData}>
                  <defs>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#22c55e" />
                      <stop offset="100%" stopColor="#16a34a" />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--card-foreground))'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="submissions" 
                    stroke="url(#lineGradient)" 
                    strokeWidth={3}
                    dot={{ fill: '#22c55e', r: 5 }}
                    activeDot={{ r: 7, fill: '#16a34a' }}
                  />
                </LineChart>
              </ResponsiveContainer>

              {/* Trend Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <TrendCard 
                  label="Total Submissions"
                  value={monthlySubmissionsData.reduce((sum, m) => sum + m.submissions, 0).toString()}
                  trend="up"
                />
                <TrendCard 
                  label="Peak Month"
                  value={monthlySubmissionsData.reduce((max, m) => m.submissions > max.submissions ? m : max).month}
                />
                <TrendCard 
                  label="Average"
                  value={Math.round(monthlySubmissionsData.reduce((sum, m) => sum + m.submissions, 0) / monthlySubmissionsData.length).toString()}
                />
                <TrendCard 
                  label="Current Month"
                  value={monthlySubmissionsData[monthlySubmissionsData.length - 1]?.submissions.toString() || "0"}
                  trend="up"
                />
              </div>
            </Section>

          </div>
        </main>
      </div>
    </div>
  );
}

/* ---------- ENHANCED COMPONENTS ---------- */

function StatCard({ title, value, icon: Icon, gradient, iconBg, iconColor }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-lg transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-muted/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
          <h3 className="text-3xl font-bold text-card-foreground">{value}</h3>
        </div>
        
        <div className={`p-3 rounded-xl ${iconBg} group-hover:scale-110 transition-transform`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>

      {/* Bottom accent line */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
    </div>
  );
}

function Section({ title, icon: Icon, description, children, fullWidth = false }) {
  return (
    <div className={`bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-lg transition-shadow ${fullWidth ? 'lg:col-span-2' : ''}`}>
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {Icon && (
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="w-5 h-5 text-primary" />
              </div>
            )}
            <h2 className="text-lg font-bold text-card-foreground">{title}</h2>
          </div>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function TrendCard({ label, value, trend }) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-lg font-bold text-card-foreground">{value}</p>
        {trend && (
          <TrendingUp className={`w-4 h-4 ${trend === 'up' ? 'text-emerald-500' : 'text-destructive'}`} />
        )}
      </div>
    </div>
  );
}