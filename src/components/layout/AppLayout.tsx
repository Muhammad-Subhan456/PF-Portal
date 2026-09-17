import { ReactNode } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <Header />

      <div className="flex">
        {/* Desktop Sidebar - fixed position handled in component */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 container py-6 pb-24 md:pb-6 md:ml-64"> {/* Added left padding for fixed sidebar */}
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
};

export default AppLayout;
