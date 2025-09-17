import { Button } from "@/components/ui/button";
import { User, Settings, DollarSign, Lock } from "lucide-react";

interface ProfileTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const ProfileTabs = ({ activeTab, onTabChange }: ProfileTabsProps) => {
  const tabs = [
    { key: "profile", label: "Profile Info", icon: User },
    { key: "preferences", label: "Preferences", icon: Settings },
    { key: "payment", label: "Payment Methods", icon: DollarSign },
    { key: "security", label: "Security", icon: Lock },
  ];

  return (
    <div className="flex items-center space-x-1 mb-8 border-b border-border">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Button
            key={tab.key}
            variant="ghost"
            className={`flex items-center space-x-2 pb-3 rounded-none border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => onTabChange(tab.key)}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </Button>
        );
      })}
    </div>
  );
};

export default ProfileTabs;