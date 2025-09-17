import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Star,
  Search,
  Filter,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ShopLayout } from "@/components/ShopLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Customer {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  avatar_url: string;
  total_orders: number;
  total_spent: number;
  last_order_date: string;
  average_rating: number;
}

interface Booking {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  slot_date: string;
  slot_time: string;
  status: string;
  created_at: string;
  notes: string;
  profiles: {
    full_name: string;
    phone: string;
    avatar_url: string;
  } | null;
}

const ShopCustomers = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'customers' | 'bookings'>('customers');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (user?.id) {
      fetchCustomers();
      fetchBookings();
    }
  }, [user?.id, statusFilter]);

  const fetchCustomers = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Fetch print jobs with customer profiles
      const { data: printJobs, error: printJobsError } = await supabase
        .from('print_jobs')
        .select(`
          customer_id,
          total_cost,
          created_at
        `)
        .eq('shop_owner_id', user.id);

      if (printJobsError) throw printJobsError;

      // Get unique customer IDs and fetch their profiles separately
      const uniqueCustomerIds = [...new Set(printJobs?.map(job => job.customer_id))];
      
      let profiles: any[] = [];
      if (uniqueCustomerIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone, avatar_url')
          .in('user_id', uniqueCustomerIds);

        if (profilesError) throw profilesError;
        profiles = profilesData || [];
      }

      // Aggregate customer data
      const customerMap = new Map<string, Customer>();

      printJobs?.forEach((job) => {
        const customerId = job.customer_id;
        const profile = profiles.find(p => p.user_id === customerId);
        
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            id: customerId,
            user_id: profile?.user_id || customerId,
            full_name: profile?.full_name || 'Unknown Customer',
            phone: profile?.phone || '',
            avatar_url: profile?.avatar_url || '',
            total_orders: 0,
            total_spent: 0,
            last_order_date: job.created_at,
            average_rating: 4.5 // Placeholder
          });
        }

        const customer = customerMap.get(customerId)!;
        customer.total_orders += 1;
        customer.total_spent += Number(job.total_cost || 0);
        
        // Update last order date if this order is more recent
        if (new Date(job.created_at) > new Date(customer.last_order_date)) {
          customer.last_order_date = job.created_at;
        }
      });

      setCustomers(Array.from(customerMap.values()));
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    if (!user?.id) return;

    try {
      let query = supabase
        .from('bookings')
        .select('*')
        .eq('shop_owner_id', user.id)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: bookingsData, error } = await query;
      
      if (error) throw error;
      
      // Get customer profiles for bookings
      const customerIds = [...new Set(bookingsData?.map(b => b.customer_id))];
      let profiles: any[] = [];
      
      if (customerIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone, avatar_url')
          .in('user_id', customerIds);

        if (profilesError) throw profilesError;
        profiles = profilesData || [];
      }

      // Map profiles to bookings
      const bookingsWithProfiles = bookingsData?.map(booking => ({
        ...booking,
        profiles: profiles.find(p => p.user_id === booking.customer_id) || null
      })) || [];
      
      setBookings(bookingsWithProfiles);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    }
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;
      
      // Update local state
      setBookings(prev => 
        prev.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: newStatus }
            : booking
        )
      );
      
      toast.success(`Booking ${newStatus} successfully`);
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error('Failed to update booking status');
    }
  };

  return (
    <ProtectedRoute requireShopOwner>
      <ShopLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Customers & Bookings</h1>
              <p className="text-muted-foreground">Manage your customers and their bookings</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setActiveTab('customers')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'customers' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              Customers ({customers.length})
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'bookings' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              Bookings ({bookings.length})
            </button>
          </div>

          {/* Filter for Bookings */}
          {activeTab === 'bookings' && (
            <div className="flex items-center space-x-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Bookings</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <>
              {/* Customers Tab */}
              {activeTab === 'customers' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {customers.length === 0 ? (
                    <div className="col-span-full">
                      <Card className="text-center py-12">
                        <CardContent>
                          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <h3 className="text-lg font-medium mb-2">No customers yet</h3>
                          <p className="text-muted-foreground">Customer data will appear here as you receive orders</p>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    customers.map((customer) => (
                      <Card key={customer.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <Avatar>
                              <AvatarImage src={customer.avatar_url} />
                              <AvatarFallback>
                                {customer.full_name[0]?.toUpperCase() || 'C'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h3 className="font-semibold">{customer.full_name}</h3>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                {customer.phone && (
                                  <div className="flex items-center space-x-2">
                                    <Phone className="w-3 h-3" />
                                    <span>{customer.phone}</span>
                                  </div>
                                )}
                                <div className="flex items-center space-x-2">
                                  <Star className="w-3 h-3" />
                                  <span>{customer.average_rating.toFixed(1)} rating</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-4 pt-4 border-t">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Total Orders</p>
                                <p className="font-medium">{customer.total_orders}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Total Spent</p>
                                <p className="font-medium">৳{customer.total_spent.toFixed(2)}</p>
                              </div>
                            </div>
                            <div className="mt-2">
                              <p className="text-xs text-muted-foreground">
                                Last order: {new Date(customer.last_order_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}

              {/* Bookings Tab */}
              {activeTab === 'bookings' && (
                <div className="space-y-4">
                  {bookings.length === 0 ? (
                    <Card className="text-center py-12">
                      <CardContent>
                        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-2">No bookings found</h3>
                        <p className="text-muted-foreground">Booking data will appear here when customers book time slots</p>
                      </CardContent>
                    </Card>
                  ) : (
                    bookings.map((booking) => (
                      <Card key={booking.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <Avatar>
                                <AvatarImage src={booking.profiles?.avatar_url} />
                                <AvatarFallback>
                                  {booking.customer_name?.[0]?.toUpperCase() || 'C'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-semibold">
                                  {booking.profiles?.full_name || booking.customer_name}
                                </h3>
                                <div className="space-y-1 text-sm text-muted-foreground">
                                  <div className="flex items-center space-x-2">
                                    <Mail className="w-3 h-3" />
                                    <span>{booking.customer_email}</span>
                                  </div>
                                  {booking.profiles?.phone && (
                                    <div className="flex items-center space-x-2">
                                      <Phone className="w-3 h-3" />
                                      <span>{booking.profiles.phone}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <Badge variant={
                                booking.status === 'confirmed' ? 'default' :
                                booking.status === 'cancelled' ? 'destructive' : 'secondary'
                              }>
                                {booking.status}
                              </Badge>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span>{new Date(booking.slot_date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span>{booking.slot_time}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Booked: {new Date(booking.created_at).toLocaleDateString()}
                            </div>
                          </div>

                          {booking.notes && (
                            <div className="mt-3 p-3 bg-muted rounded-lg">
                              <p className="text-sm"><strong>Notes:</strong> {booking.notes}</p>
                            </div>
                          )}

                          {booking.status === 'confirmed' && (
                            <div className="mt-4 flex space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateBookingStatus(booking.id, 'completed')}
                              >
                                Mark Completed
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </ShopLayout>
    </ProtectedRoute>
  );
};

export default ShopCustomers;