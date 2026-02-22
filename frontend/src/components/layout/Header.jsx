import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LogOut,
  Bell,
  User,
  Sun,
  Moon,
  ChevronDown,
  Settings,
  HelpCircle,
  CheckCircle,
  AlertCircle,
  Info,
  XCircle,
  X,
  Loader2,
} from "lucide-react";
import { supabase } from "../../supabase/client";

export default function Header({ title }) {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userId, setUserId] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
    fetchUserData();
    loadNotifications();

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          console.log("Notification change:", payload);
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchUserData() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);
        setUserEmail(user.email);

        const { data: profile, error } = await supabase
          .from("users")
          .select("full_name, role")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error details:", error);
          return;
        }

        if (profile) {
          setUserName(profile.full_name);
          setUserRole(profile.role);
        }
      }
    } catch (error) {
      console.error("Caught error:", error);
    }
  }

  async function loadNotifications() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter((n) => !n.is_read).length || 0);
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  }

  async function markAsRead(notificationId) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("user_id", user.id); // ✅ Add user_id check

      if (error) throw error;

      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }

  async function markAllAsRead() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;

      // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  }

  async function deleteNotification(e, notificationId) {
    e.stopPropagation(); // Prevent click from bubbling
    
    try {
      setDeletingId(notificationId);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("No user found");
        return;
      }

      console.log("Deleting notification:", notificationId, "for user:", user.id);

      // ✅ Add user_id to ensure the user owns this notification
      const { data, error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId)
        .eq("user_id", user.id) // ✅ Important: Add user_id check
        .select(); // ✅ Add select to see what was deleted

      if (error) {
        console.error("Delete error:", error);
        throw error;
      }

      console.log("Delete result:", data);

      // ✅ Optimistic update - remove from local state immediately
      setNotifications((prev) => {
        const notification = prev.find((n) => n.id === notificationId);
        if (notification && !notification.is_read) {
          setUnreadCount((count) => Math.max(0, count - 1));
        }
        return prev.filter((n) => n.id !== notificationId);
      });

    } catch (error) {
      console.error("Error deleting notification:", error);
      // Reload notifications on error to sync state
      await loadNotifications();
    } finally {
      setDeletingId(null);
    }
  }

  async function clearAllNotifications() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  }

  function handleNotificationClick(notification) {
    markAsRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
      setShowNotifications(false);
    }
  }

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowDropdown(false);
  };

  const handleNavigateToSettings = () => {
    setShowDropdown(false);
    const settingsPath = `/${userRole.toLowerCase()}/settings`;
    navigate(settingsPath);
  };

  const getInitials = () => {
    if (userName) {
      return userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return userEmail ? userEmail[0].toUpperCase() : "U";
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case "error":
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border shadow-sm">
      <div className="px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Left: Title */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block w-1 h-8 bg-gradient-to-b from-primary to-primary/50 rounded-full"></div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent tracking-tight">
              {title}
            </h1>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="group relative p-2 sm:p-2.5 rounded-xl hover:bg-accent transition-all duration-300"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              {isDark ? (
                <Sun className="w-5 h-5 text-amber-500 group-hover:rotate-180 transition-transform duration-500" />
              ) : (
                <Moon className="w-5 h-5 text-primary group-hover:-rotate-12 transition-transform duration-300" />
              )}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="group relative p-2 sm:p-2.5 rounded-xl hover:bg-accent transition-all duration-300"
                title="Notifications"
              >
                <Bell
                  className={`w-5 h-5 transition-colors ${
                    showNotifications
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-primary"
                  } ${unreadCount > 0 ? "animate-pulse" : ""}`}
                />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-card animate-in zoom-in">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifications(false)}
                  ></div>

                  <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[500px] bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="p-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5">
                      <div>
                        <h3 className="font-semibold text-card-foreground">
                          Notifications
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {unreadCount > 0
                            ? `${unreadCount} unread`
                            : "All caught up!"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs text-primary hover:underline font-medium"
                          >
                            Mark all read
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button
                            onClick={clearAllNotifications}
                            className="text-xs text-destructive hover:underline font-medium"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-[400px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                          <p className="text-sm text-muted-foreground">
                            No notifications yet
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-border">
                          {notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`p-4 hover:bg-accent/50 transition-colors cursor-pointer group relative ${
                                !notification.is_read ? "bg-primary/5" : ""
                              }`}
                              onClick={() => handleNotificationClick(notification)}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-0.5">
                                  {getNotificationIcon(notification.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p
                                      className={`text-sm font-semibold ${
                                        !notification.is_read
                                          ? "text-card-foreground"
                                          : "text-muted-foreground"
                                      }`}
                                    >
                                      {notification.title}
                                    </p>
                                    {!notification.is_read && (
                                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5"></div>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    {new Date(
                                      notification.created_at
                                    ).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                </div>
                                {/* ✅ Fixed Delete Button */}
                                <button
                                  onClick={(e) => deleteNotification(e, notification.id)}
                                  disabled={deletingId === notification.id}
                                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 rounded-lg transition-all flex-shrink-0 disabled:opacity-50"
                                  title="Delete notification"
                                >
                                  {deletingId === notification.id ? (
                                    <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                                  ) : (
                                    <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-8 bg-border"></div>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-xl hover:bg-accent transition-all duration-300 group"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/20">
                  {getInitials()}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-foreground truncate max-w-[120px]">
                    {userName || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {userRole?.toLowerCase() || "Member"}
                  </p>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                    showDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowDropdown(false)}
                  ></div>

                  <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* User Info */}
                    <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center text-primary-foreground font-bold text-lg shadow-lg">
                          {getInitials()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-card-foreground truncate">
                            {userName || "User"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {userEmail}
                          </p>
                          <span className="inline-flex items-center px-2 py-0.5 mt-1 text-[10px] font-medium bg-primary/10 text-primary rounded-full capitalize">
                            {userRole?.toLowerCase() || "Member"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                      <button
                        onClick={handleNavigateToSettings}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-card-foreground hover:bg-accent rounded-lg transition-colors"
                      >
                        <Settings className="w-4 h-4 text-muted-foreground" />
                        Settings
                      </button>

                      <button
                        onClick={() => setShowDropdown(false)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-card-foreground hover:bg-accent rounded-lg transition-colors"
                      >
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                        Help & Support
                      </button>
                    </div>

                    {/* Logout */}
                    <div className="p-2 border-t border-border">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}