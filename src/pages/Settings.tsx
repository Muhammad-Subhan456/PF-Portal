import { useNavigate } from "react-router-dom";
import { Bell, Moon, Sun, Shield, HelpCircle, LogOut } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";

const settingsSections = [
  {
    title: "Notifications",
    icon: Bell,
    settings: [
      { id: "grades", label: "Grade Updates", description: "Get notified when new grades are posted", defaultChecked: true },
      { id: "assignments", label: "New Assignments", description: "Get notified when assignments are uploaded", defaultChecked: true },
      { id: "deadlines", label: "Deadline Reminders", description: "Receive reminders before deadlines", defaultChecked: true },
      { id: "solutions", label: "Solution Releases", description: "Get notified when solutions are available", defaultChecked: false },
    ]
  },
  {
    title: "Appearance",
    icon: Sun,
    settings: [
      { id: "darkMode", label: "Dark Mode", description: "Switch between light and dark theme", defaultChecked: false },
    ]
  },
];

const Settings = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error: any) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="animate-fade-in">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Settings</h1>
          <p className="text-muted-foreground">Manage your preferences and account settings</p>
        </div>

        {settingsSections.map((section, sectionIndex) => {
          const Icon = section.icon;
          return (
            <div 
              key={section.title} 
              className="bg-card rounded-2xl border border-border p-6 animate-fade-in"
              style={{ animationDelay: `${(sectionIndex + 1) * 100}ms` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
              </div>

              <div className="space-y-4">
                {section.settings.map((setting, index) => (
                  <div key={setting.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{setting.label}</p>
                        <p className="text-xs text-muted-foreground">{setting.description}</p>
                      </div>
                      <Switch defaultChecked={setting.defaultChecked} />
                    </div>
                    {index < section.settings.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Help & Support */}
        <div 
          className="bg-card rounded-2xl border border-border p-6 animate-fade-in"
          style={{ animationDelay: "300ms" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Help & Support</h2>
          </div>

          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start rounded-xl">
              <Shield className="h-4 w-4 mr-2" />
              Privacy Policy
            </Button>
            <Button variant="outline" className="w-full justify-start rounded-xl">
              <HelpCircle className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
          </div>
        </div>

        {/* Sign Out */}
        <div 
          className="animate-fade-in"
          style={{ animationDelay: "400ms" }}
        >
          <Button 
            variant="outline" 
            className="w-full rounded-xl border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;
