import { useState } from "react";
import { Home, BarChart3, BookOpen, FileText, HelpCircle, User, ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  { icon: Home, label: "Dashboard", path: "/admin" },
  { icon: BarChart3, label: "Grades", path: "/admin/grades" },
  { icon: BookOpen, label: "Content", path: "/admin/labs", hasSubmenu: true },
  { icon: User, label: "Students", path: "/admin/students" },
];

const contentSubItems = [
  { icon: BookOpen, label: "Labs", path: "/admin/labs" },
  { icon: FileText, label: "Assignments", path: "/admin/assignments" },
  { icon: HelpCircle, label: "Quizzes", path: "/admin/quizzes" },
];

const AdminMobileNav = () => {
  const location = useLocation();
  const [contentSheetOpen, setContentSheetOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/admin/labs") {
      return ["/admin/labs", "/admin/assignments", "/admin/quizzes"].includes(location.pathname);
    }
    return location.pathname === path;
  };

  const isContentActive = ["/admin/labs", "/admin/assignments", "/admin/quizzes"].includes(location.pathname);

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50 md:hidden">
      <div className="flex items-center justify-around rounded-full bg-[#1a1a1a] px-4 py-2 shadow-float">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          
          if (item.hasSubmenu) {
            return (
              <Sheet key={item.path} open={contentSheetOpen} onOpenChange={setContentSheetOpen}>
                <SheetTrigger asChild>
                  <button
                    className={cn(
                      "flex flex-col items-center gap-0.5 px-5 py-2 rounded-full transition-all duration-200",
                      isContentActive ? "bg-secondary" : ""
                    )}
                  >
                    <Icon className={cn(
                      "h-5 w-5", 
                      isContentActive ? "text-secondary-foreground" : "text-gray-400"
                    )} />
                    <span className={cn(
                      "text-[10px] font-medium",
                      isContentActive ? "text-secondary-foreground" : "text-gray-400"
                    )}>
                      {item.label}
                    </span>
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-auto">
                  <SheetHeader>
                    <SheetTitle>Content</SheetTitle>
                    <SheetDescription>Select content type to manage</SheetDescription>
                  </SheetHeader>
                  <div className="grid grid-cols-1 gap-2 mt-4">
                    {contentSubItems.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const isSubActive = location.pathname === subItem.path;
                      return (
                        <Link
                          key={subItem.path}
                          to={subItem.path}
                          onClick={() => setContentSheetOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                            isSubActive 
                              ? "bg-secondary text-secondary-foreground" 
                              : "hover:bg-muted"
                          )}
                        >
                          <SubIcon className="h-5 w-5" />
                          <span className="font-medium">{subItem.label}</span>
                          {isSubActive && <ChevronRight className="ml-auto h-4 w-4" />}
                        </Link>
                      );
                    })}
                  </div>
                </SheetContent>
              </Sheet>
            );
          }
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-0.5 px-5 py-2 rounded-full transition-all duration-200",
                active ? "bg-secondary" : ""
              )}
            >
              <Icon className={cn(
                "h-5 w-5", 
                active ? "text-secondary-foreground" : "text-gray-400"
              )} />
              <span className={cn(
                "text-[10px] font-medium",
                active ? "text-secondary-foreground" : "text-gray-400"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default AdminMobileNav;
