import { useState } from "react";
import Header from "@/components/Header";
import ProfileTabs from "@/components/ProfileTabs";
import PersonalInformation from "@/components/PersonalInformation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Star } from "lucide-react";

const MyProfile = () => {
  const [activeTab, setActiveTab] = useState("profile");

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return <PersonalInformation />;
      case "preferences":
        return (
          <div className="bg-card rounded-lg border border-border p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Preferences</h3>
            <p className="text-muted-foreground">Manage your app preferences and settings.</p>
          </div>
        );
      case "payment":
        return (
          <div className="bg-card rounded-lg border border-border p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Payment Methods</h3>
            <p className="text-muted-foreground">Add and manage your payment methods.</p>
          </div>
        );
      case "security":
        return (
          <div className="bg-card rounded-lg border border-border p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Security</h3>
            <p className="text-muted-foreground">Manage your account security settings.</p>
          </div>
        );
      default:
        return <PersonalInformation />;
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
      
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            My Profile
          </h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Profile Header Card */}
        <div className="bg-card rounded-lg border border-border p-6 mb-8">
          <div className="flex items-center space-x-6">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src="" alt="Profile picture" />
                <AvatarFallback className="bg-muted text-2xl">
                  <User className="w-12 h-12" />
                </AvatarFallback>
              </Avatar>
            </div>
            
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground mb-1">Sabbir Hossain</h2>
              <p className="text-muted-foreground mb-2">sabbirhossainnde@gmail.com</p>
              <div className="flex items-center space-x-1 text-sm text-primary">
                <Star className="w-4 h-4 fill-current" />
                <span>Member since August 2025</span>
              </div>
            </div>

            <div className="flex space-x-4">
              <div className="text-center bg-blue-50 rounded-lg p-4 min-w-[100px]">
                <div className="text-2xl font-bold text-blue-600">0</div>
                <div className="text-sm text-blue-600">Total Jobs</div>
              </div>
              <div className="text-center bg-green-50 rounded-lg p-4 min-w-[100px]">
                <div className="text-2xl font-bold text-green-600">৳0.00</div>
                <div className="text-sm text-green-600">Total Spent</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        {renderTabContent()}
      </main>
    </div>
    </ProtectedRoute>
  );
};

export default MyProfile;