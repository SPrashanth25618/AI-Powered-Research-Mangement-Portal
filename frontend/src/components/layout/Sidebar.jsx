import { NavLink } from "react-router-dom";
import {
  FileText,
  BarChart,
  CheckSquare,
  Users,
  LayoutDashboard,
  Settings,
  Loader2,
} from "lucide-react";

export default function Sidebar({ role }) {
  // Centralized Menu Configuration
  const menuConfig = {
    STUDENT: [
      { name: "Dashboard", path: "/student", icon: LayoutDashboard },
      { name: "My Research", path: "/student/research", icon: FileText },
      { name: "Settings", path: "/student/settings", icon: Settings },
    ],
    FACULTY: [
      { name: "Dashboard", path: "/faculty", icon: LayoutDashboard },
      { name: "Pending Review", path: "/faculty/pending", icon: CheckSquare },
      { name: "Students", path: "/faculty/students", icon: Users },
      { name: "Settings", path: "/faculty/settings", icon: Settings },
    ],
    HOD: [
      { name: "Dashboard", path: "/hod", icon: LayoutDashboard },
      { name: "Final Approvals", path: "/hod/approvals", icon: CheckSquare },
      { name: "Statistics", path: "/hod/stats", icon: BarChart },
      { name: "Settings", path: "/hod/settings", icon: Settings },
    ],
    ADMIN: [
      { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
      { name: "User Management", path: "/admin/users", icon: Users },
      { name: "System Settings", path: "/admin/settings", icon: Settings },
    ],
  };

  const activeLinks = menuConfig[role] || [];

  return (
    <div className="w-64 bg-card border-r border-border text-card-foreground min-h-screen flex flex-col p-4">
      
      {/* Brand / Logo Section */}
      <div className="flex items-center gap-2 px-2 mb-8">
        <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
          <FileText className="text-primary-foreground w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold leading-none tracking-tight">ResearchHub</h2>
          <p className="text-[10px] text-muted-foreground font-medium mt-1 uppercase tracking-wider">Portal</p>
        </div>
      </div>

      {/* Navigation Section */}
      <nav className="space-y-1.5 flex-1">
        {!role ? (
          // Loading state when role is not yet loaded
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground">Loading menu...</p>
          </div>
        ) : activeLinks.length === 0 ? (
          // Empty state if no menu items
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-xs text-muted-foreground text-center">
              No menu items available
            </p>
          </div>
        ) : (
          // Normal menu items
          activeLinks.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group
                ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }
              `}
            >
              <item.icon className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110`} />
              {item.name}
            </NavLink>
          ))
        )}
      </nav>

      {/* Footer / Role Indicator */}
      <div className="pt-4 border-t border-border mt-auto">
        <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${role ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            {role || "Loading..."} Mode
          </span>
        </div>
      </div>
    </div>
  );
}