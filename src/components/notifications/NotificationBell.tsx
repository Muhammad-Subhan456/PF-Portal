import { useState, useEffect } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getStudentNotifications, markNotificationAsRead, markAllNotificationsAsRead, getUnreadCount, type Notification } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const NotificationBell = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (profile?.roll_number) {
      fetchNotifications();
      // Refresh notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [profile]);

  const fetchNotifications = async () => {
    if (!profile?.roll_number) return;
    
    try {
      const notifs = await getStudentNotifications(
        profile.roll_number,
        profile.section as 'CS-F26-M' | 'CS-F26-A' | undefined
      );
      
      // Merge with existing notifications to preserve all (don't lose old ones)
      const existingNotifs = JSON.parse(localStorage.getItem('allNotifications') || '[]') as Notification[];
      const existingNotifsMap = new Map(existingNotifs.map(n => [n.id, n]));
      
      // Add new notifications and update existing ones
      notifs.forEach(notif => {
        existingNotifsMap.set(notif.id, notif);
      });
      
      // Convert back to array and sort by timestamp
      const allNotifs = Array.from(existingNotifsMap.values()).sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      
      // Store all notifications
      localStorage.setItem('allNotifications', JSON.stringify(allNotifs));
      setNotifications(allNotifs);
      setUnreadCount(getUnreadCount(allNotifs));
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read but keep notification visible
    markNotificationAsRead(notification.id);
    // Update local state to reflect read status
    setNotifications(prev => prev.map(n => 
      n.id === notification.id ? { ...n, read: true } : n
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
    if (notification.link) {
      navigate(notification.link);
      setOpen(false);
    }
  };

  const handleMarkAllRead = () => {
    // Mark all as read but keep notifications visible
    notifications.forEach(n => markNotificationAsRead(n.id));
    // Update local state
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: Notification['type']) => {
    const iconClass = "h-5 w-5";
    switch (type) {
      case 'grade_added':
        return <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center"><div className="h-4 w-4 rounded bg-primary" /></div>;
      case 'new_assignment':
      case 'new_lab':
      case 'new_quiz':
        return <div className="h-8 w-8 rounded-full bg-secondary/20 flex items-center justify-center"><div className="h-4 w-4 rounded bg-secondary" /></div>;
      case 'deadline_approaching':
        return <div className="h-8 w-8 rounded-full bg-warning/20 flex items-center justify-center"><div className="h-4 w-4 rounded bg-warning" /></div>;
      case 'deadline_passed':
        return <div className="h-8 w-8 rounded-full bg-destructive/20 flex items-center justify-center"><div className="h-4 w-4 rounded bg-destructive" /></div>;
      case 'solution_available':
        return <div className="h-8 w-8 rounded-full bg-success/20 flex items-center justify-center"><div className="h-4 w-4 rounded bg-success" /></div>;
      default:
        return <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"><div className="h-4 w-4 rounded bg-muted-foreground" /></div>;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const readNotifications = JSON.parse(localStorage.getItem('readNotifications') || '[]');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-xl hover:bg-muted">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-96 max-w-[400px] p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-foreground">Notifications</h3>
          {notifications.length > 0 && unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="h-8 text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const isRead = readNotifications.includes(notification.id);
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 hover:bg-muted/50 cursor-pointer transition-colors",
                      !isRead && "bg-primary/5"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-medium text-sm",
                          !isRead && "font-semibold"
                        )}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTime(notification.timestamp)}
                          <span className="ml-2 opacity-70">
                            {new Date(notification.timestamp).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </p>
                      </div>
                      {!isRead && (
                        <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
