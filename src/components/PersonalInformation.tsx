import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

const PersonalInformation = () => {
  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Personal Information</h3>
          <p className="text-muted-foreground">Update your personal details and contact information</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          Edit Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            defaultValue="Sabbir Hossain"
            className="bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            defaultValue="sabbirhossainnde@gmail.com"
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">Email cannot be changed for security reasons</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="Enter your phone number"
            className="bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Street Address</Label>
          <Input
            id="address"
            placeholder="Enter your street address"
            className="bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            placeholder="Enter your city"
            className="bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            placeholder="Enter your state"
            className="bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="zipCode">ZIP Code</Label>
          <Input
            id="zipCode"
            placeholder="Enter your ZIP code"
            className="bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="favoriteShop">Favorite Shop</Label>
          <div className="flex items-center space-x-2 p-3 bg-muted rounded-md text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>No orders yet</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalInformation;