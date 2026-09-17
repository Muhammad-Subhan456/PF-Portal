import { Search, User, Mail, LogOut } from "lucide-react"; // Rebuild trigger
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import NotificationBell from "@/components/notifications/NotificationBell";

const Header = () => {
  const { profile, signOut, user } = useAuth();
  const navigate = useNavigate();

  // Get avatar URL from user metadata (Google OAuth provides this)
  // Google primarily uses 'picture', relying on 'avatar_url' frequently fails or returns 404
  const avatarUrl = user?.user_metadata?.picture || user?.user_metadata?.avatar_url || user?.user_metadata?.avatar || null;
  const initials = profile?.name
    ? profile.name.split(" ").map(n => n[0]).join("").toUpperCase()
    : profile?.roll_number?.substring(0, 2).toUpperCase() || "U";

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error: any) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Logo & Branding */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-soft">
            <span className="text-lg font-bold text-primary-foreground">PF</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">PF Portal</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">PUCIT • Fall 2026</p>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Notifications */}
          <NotificationBell />

          {/* User Profile with Dropdown */}
          <div className="flex items-center gap-3 pl-2 border-l border-border">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-foreground">{profile?.name || 'Student'}</p>
              <p className="text-xs text-muted-foreground font-mono">{profile?.roll_number || 'N/A'}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl bg-muted hover:bg-muted/80 p-0">
                  <Avatar className="h-8 w-8 rounded-xl ring-2 ring-primary/20 bg-background">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={profile?.name || 'User'} referrerPolicy="no-referrer" />}
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{profile?.name || 'Student'}</p>
                    <p className="text-xs leading-none text-muted-foreground font-mono">{profile?.roll_number || 'N/A'}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/contact" className="cursor-pointer">
                    <Mail className="mr-2 h-4 w-4" />
                    Contact
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
