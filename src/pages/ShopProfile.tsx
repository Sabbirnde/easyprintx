import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Store, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Camera,
  Save,
  RefreshCw,
  Star,
  Clock,
  Users,
  TrendingUp,
  Calendar,
  DollarSign
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ShopLayout } from "@/components/ShopLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

interface ShopProfileData {
  id?: string;
  shop_name: string;
  description: string;
  address: string;
  phone_number: string;
  email_address: string;
  website_url: string;
  logo_url: string;
  shop_owner_id: string;
}

interface ShopStats {
  totalOrders: number;
  totalRevenue: number;
  averageRating: number;
  totalCustomers: number;
  activeBookings: number;
  monthlyGrowth: number;
}

const ShopProfile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  
  const [shopData, setShopData] = useState<ShopProfileData>({
    shop_name: '',
    description: '',
    address: '',
    phone_number: '',
    email_address: '',
    website_url: '',
    logo_url: '',
    shop_owner_id: user?.id || ''
  });

  const [stats, setStats] = useState<ShopStats>({
    totalOrders: 0,
    totalRevenue: 0,
    averageRating: 0,
    totalCustomers: 0,
    activeBookings: 0,
    monthlyGrowth: 0
  });

  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchShopData();
      fetchShopStats();
      fetchRecentActivity();
    }
  }, [user?.id]);

  const fetchShopData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Fetch private shop info (for shop owner only)
      const { data: privateData, error: privateError } = await supabase
        .from('shop_info')
        .select('*')
        .eq('shop_owner_id', user.id)
        .maybeSingle();

      if (privateError && privateError.code !== 'PGRST116') {
        throw privateError;
      }

      // Fetch public shop directory entry
      const { data: publicData, error: publicError } = await supabase
        .from('public_shop_directory')
        .select('*')
        .eq('shop_owner_id', user.id)
        .maybeSingle();

      if (publicError && publicError.code !== 'PGRST116') {
        throw publicError;
      }

      // Combine data from both tables
      if (privateData && publicData) {
        setShopData({
          id: privateData.id,
          shop_name: publicData.shop_name,
          description: publicData.description || '',
          address: publicData.address || '',
          phone_number: privateData.phone_number || '',
          email_address: privateData.email_address || '',
          website_url: publicData.website_url || '',
          logo_url: publicData.logo_url || '',
          shop_owner_id: user.id
        });
      } else {
        // Initialize with user data if no shop profile exists
        setShopData(prev => ({
          ...prev,
          shop_name: 'My Print Shop',
          email_address: user.email || '',
          shop_owner_id: user.id
        }));
      }
    } catch (error) {
      console.error('Error fetching shop data:', error);
      toast.error('Failed to load shop profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchShopStats = async () => {
    if (!user?.id) return;

    try {
      // Fetch print jobs statistics
      const { data: printJobs, error: printJobsError } = await supabase
        .from('print_jobs')
        .select('total_cost, status, created_at, customer_id')
        .eq('shop_owner_id', user.id);

      if (printJobsError) throw printJobsError;

      // Fetch bookings statistics
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('status, created_at, customer_id')
        .eq('shop_owner_id', user.id);

      if (bookingsError) throw bookingsError;

      // Calculate statistics
      const totalRevenue = printJobs?.reduce((sum, job) => sum + Number(job.total_cost || 0), 0) || 0;
      const uniqueCustomers = new Set([
        ...(printJobs?.map(job => job.customer_id) || []),
        ...(bookings?.map(booking => booking.customer_id) || [])
      ]).size;

      const activeBookings = bookings?.filter(booking => booking.status === 'confirmed').length || 0;

      // Calculate monthly growth (simplified)
      const currentMonth = new Date().getMonth();
      const currentMonthOrders = printJobs?.filter(job => 
        new Date(job.created_at).getMonth() === currentMonth
      ).length || 0;
      
      const lastMonthOrders = printJobs?.filter(job => 
        new Date(job.created_at).getMonth() === currentMonth - 1
      ).length || 0;

      const growth = lastMonthOrders > 0 ? 
        ((currentMonthOrders - lastMonthOrders) / lastMonthOrders) * 100 : 0;

      setStats({
        totalOrders: printJobs?.length || 0,
        totalRevenue,
        averageRating: 4.5, // Placeholder - would calculate from reviews
        totalCustomers: uniqueCustomers,
        activeBookings,
        monthlyGrowth: growth
      });

    } catch (error) {
      console.error('Error fetching shop stats:', error);
    }
  };

  const fetchRecentActivity = async () => {
    if (!user?.id) return;

    try {
      // Fetch recent orders
      const { data: orders, error: ordersError } = await supabase
        .from('print_jobs')
        .select('*, profiles!print_jobs_customer_id_fkey(full_name)')
        .eq('shop_owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (ordersError) throw ordersError;
      setRecentOrders(orders || []);

      // Fetch recent customers (unique customers from recent orders)
      const uniqueCustomerIds = [...new Set(orders?.map(order => order.customer_id))].slice(0, 5);
      
      if (uniqueCustomerIds.length > 0) {
        const { data: customers, error: customersError } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', uniqueCustomerIds);

        if (customersError) throw customersError;
        setRecentCustomers(customers || []);
      }

    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const saveShopProfile = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      // Save private contact information to shop_info table
      const { error: privateError } = await supabase
        .from('shop_info')
        .upsert({
          shop_owner_id: user.id,
          phone_number: shopData.phone_number,
          email_address: shopData.email_address
        });

      if (privateError) throw privateError;

      // Save public business information to public_shop_directory table
      const { error: publicError } = await supabase
        .from('public_shop_directory')
        .upsert({
          shop_owner_id: user.id,
          shop_name: shopData.shop_name,
          description: shopData.description,
          address: shopData.address,
          website_url: shopData.website_url,
          logo_url: shopData.logo_url,
          is_active: true
        });

      if (publicError) throw publicError;
      
      toast.success('Shop profile updated successfully');
    } catch (error) {
      console.error('Error saving shop profile:', error);
      toast.error('Failed to save shop profile');
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file: File) => {
    if (!user?.id) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/logo.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(fileName);

      // Update logo in public directory (since logo is public business info)
      await supabase
        .from('public_shop_directory')
        .update({ logo_url: data.publicUrl })
        .eq('shop_owner_id', user.id);

      setShopData(prev => ({ ...prev, logo_url: data.publicUrl }));
      toast.success('Logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadLogo(file);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requireShopOwner>
        <ShopLayout>
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>
        </ShopLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireShopOwner>
      <ShopLayout>
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Shop Profile</h1>
              <p className="text-muted-foreground">Manage your shop information and view performance</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-xl font-bold">৳{stats.totalRevenue.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Customers</p>
                  <p className="text-xl font-bold">{stats.totalCustomers}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Bookings</p>
                  <p className="text-xl font-bold">{stats.activeBookings}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Star className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average Rating</p>
                  <p className="text-xl font-bold">{stats.averageRating.toFixed(1)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">Shop Profile</TabsTrigger>
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Store className="w-5 h-5" />
                    <span>Shop Information</span>
                  </CardTitle>
                  <CardDescription>Update your shop details and contact information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Logo Section */}
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={shopData.logo_url} />
                        <AvatarFallback>
                          <Store className="w-8 h-8" />
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full p-0"
                        onClick={() => document.getElementById('logo-upload')?.click()}
                      >
                        <Camera className="w-4 h-4" />
                      </Button>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </div>
                    <div>
                      <h3 className="font-medium">Shop Logo</h3>
                      <p className="text-sm text-muted-foreground">Upload a logo for your shop (recommended: 200x200px)</p>
                    </div>
                  </div>

                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="shop-name">Shop Name *</Label>
                      <Input
                        id="shop-name"
                        value={shopData.shop_name}
                        onChange={(e) => setShopData(prev => ({ ...prev, shop_name: e.target.value }))}
                        placeholder="Enter your shop name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={shopData.email_address}
                        onChange={(e) => setShopData(prev => ({ ...prev, email_address: e.target.value }))}
                        placeholder="shop@example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={shopData.phone_number}
                        onChange={(e) => setShopData(prev => ({ ...prev, phone_number: e.target.value }))}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website">Website URL</Label>
                      <Input
                        id="website"
                        value={shopData.website_url}
                        onChange={(e) => setShopData(prev => ({ ...prev, website_url: e.target.value }))}
                        placeholder="https://yourshop.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address *</Label>
                    <Input
                      id="address"
                      value={shopData.address}
                      onChange={(e) => setShopData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="123 Main St, City, State 12345"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={shopData.description}
                      onChange={(e) => setShopData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your shop and services..."
                      rows={4}
                    />
                  </div>

                  <Button onClick={saveShopProfile} disabled={saving}>
                    {saving ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Profile
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Orders */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentOrders.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No recent orders</p>
                    ) : (
                      <div className="space-y-3">
                        {recentOrders.map((order) => (
                          <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{order.file_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {order.profiles?.full_name || 'Customer'} • {order.pages} pages
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge variant={
                                order.status === 'completed' ? 'default' :
                                order.status === 'printing' ? 'secondary' : 'outline'
                              }>
                                {order.status}
                              </Badge>
                              <p className="text-sm text-muted-foreground mt-1">
                                ৳{Number(order.total_cost || 0).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Customers */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Customers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentCustomers.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No recent customers</p>
                    ) : (
                      <div className="space-y-3">
                        {recentCustomers.map((customer) => (
                          <div key={customer.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                            <Avatar>
                              <AvatarImage src={customer.avatar_url} />
                              <AvatarFallback>
                                {customer.full_name?.[0] || 'C'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{customer.full_name || 'Customer'}</p>
                              <p className="text-sm text-muted-foreground">{customer.phone || 'No phone'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total Orders</span>
                        <span className="font-medium">{stats.totalOrders}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Revenue</span>
                        <span className="font-medium">৳{stats.totalRevenue.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Growth</span>
                        <span className={`font-medium ${stats.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {stats.monthlyGrowth >= 0 ? '+' : ''}{stats.monthlyGrowth.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Customer Satisfaction</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Average Rating</span>
                        <span className="font-medium">{stats.averageRating.toFixed(1)} / 5.0</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total Customers</span>
                        <span className="font-medium">{stats.totalCustomers}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Active Bookings</span>
                        <span className="font-medium">{stats.activeBookings}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ShopLayout>
    </ProtectedRoute>
  );
};

export default ShopProfile;