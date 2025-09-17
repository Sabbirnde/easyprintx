import React from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ShopSidebar } from "@/components/ShopSidebar";

interface ShopLayoutProps {
  children: React.ReactNode;
}

export function ShopLayout({ children }: ShopLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ShopSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b bg-background px-4">
            <SidebarTrigger />
            <h1 className="ml-4 text-lg font-semibold">Shop Management</h1>
          </header>
          
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}