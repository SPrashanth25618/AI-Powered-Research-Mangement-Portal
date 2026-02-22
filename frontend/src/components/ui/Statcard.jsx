export default function StatCard({ label, value, icon: Icon, color = "primary" }) {
  // Uses theme variables so it looks good in Dark Mode
  const variants = {
    primary: "bg-primary/10 text-primary border-primary/20",
    emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    destructive: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <h2 className="text-3xl font-bold text-card-foreground tracking-tight group-hover:text-primary transition-colors">
            {value}
          </h2>
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl border transition-transform group-hover:scale-110 ${variants[color] || variants.primary}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
}