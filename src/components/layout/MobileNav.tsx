import { useState } from "react";
import { Home, BarChart3, FolderOpen, User, BookOpen, FileText, HelpCircle, ChevronRight } from "lucide-react";
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
  { icon: Home, label: "Home", path: "/" },
  { icon: BarChart3, label: "Grades", path: "/grades" },
  { icon: FolderOpen, label: "Materials", path: "/materials", hasSubmenu: true },
  { icon: User, label: "Profile", path: "/profile" },
];

const materialsSubItems = [
  { icon: BookOpen, label: "Labs", path: "/materials/labs" },
  { icon: FileText, label: "Assignments", path: "/materials/assignments" },
  { icon: HelpCircle, label: "Quizzes", path: "/materials/quizzes" },
];

const MobileNav = () => {
  const location = useLocation();
  const [materialsSheetOpen, setMaterialsSheetOpen] = useState(false);

  const isMaterialsActive = ["/materials", "/materials/labs", "/materials/assignments", "/materials/quizzes"].includes(location.pathname);

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50 md:hidden">
      <div className="flex items-center justify-around rounded-full bg-[#1a1a1a] px-4 py-2 shadow-float">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          if (item.hasSubmenu) {
            return (
              <Sheet key={item.path} open={materialsSheetOpen} onOpenChange={setMaterialsSheetOpen}>
                <SheetTrigger asChild>
                  <button
                    className={cn(
                      "flex flex-col items-center gap-0.5 px-5 py-2 rounded-full transition-all duration-200",
                      isMaterialsActive ? "bg-primary" : ""
                    )}
                  >
                    <Icon className={cn(
                      "h-5 w-5", 
                      isMaterialsActive ? "text-primary-foreground" : "text-gray-400"
                    )} />
                    <span className={cn(
                      "text-[10px] font-medium",
                      isMaterialsActive ? "text-primary-foreground" : "text-gray-400"
                    )}>
                      {item.label}
                    </span>
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-auto">
                  <SheetHeader>
                    <SheetTitle>Materials</SheetTitle>
                    <SheetDescription>Select material type to view</SheetDescription>
                  </SheetHeader>
                  <div className="grid grid-cols-1 gap-2 mt-4">
                    {materialsSubItems.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const isSubActive = location.pathname === subItem.path;
                      return (
                        <Link
                          key={subItem.path}
                          to={subItem.path}
                          onClick={() => setMaterialsSheetOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                            isSubActive 
                              ? "bg-primary text-primary-foreground" 
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
                isActive 
                  ? "bg-primary" 
                  : ""
              )}
            >
              <Icon className={cn(
                "h-5 w-5", 
                isActive ? "text-primary-foreground" : "text-gray-400"
              )} />
              <span className={cn(
                "text-[10px] font-medium",
                isActive ? "text-primary-foreground" : "text-gray-400"
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

export default MobileNav;
