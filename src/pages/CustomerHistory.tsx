import React, { useState, useEffect } from 'react';
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Printer, 
  Calendar, 
  Clock, 
  MapPin,
  Eye,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ProtectedRoute from "@/components/ProtectedRoute";

const CustomerHistory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [printJobs, setPrintJobs] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'prints' | 'bookings'>('prints');

  useEffect(() => {
    if (user?.id) {
      fetchPrintHistory();
      fetchBookingHistory();
    }
  }, [user?.id, statusFilter]);

  const fetchPrintHistory = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('print_jobs')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'pending' | 'queued' | 'printing' | 'completed' | 'cancelled');
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setPrintJobs(data || []);
    } catch (error) {
      console.error('Error fetching print history:', error);
      toast({
        title: "Error",
        description: "Failed to load print history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingHistory = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          shop_info!bookings_shop_owner_id_fkey(shop_name, address)
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching booking history:', error);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                My History
              </h1>
              <p className="text-muted-foreground">
                View your print jobs and booking history
              </p>
            </div>

            {/* Header with Tabs */}
            <div className="mb-6">
              <div className="flex items-center space-x-4 mb-4">
                <button
                  onClick={() => setActiveTab('prints')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'prints' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  Print Jobs ({printJobs.length})
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

              {activeTab === 'prints' && (
                <div className="flex items-center space-x-4">
                  <Label htmlFor="status-filter">Filter by status:</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="printing">Printing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                <div className="text-muted-foreground">Loading your history...</div>
              </div>
            ) : (
              <>
                {/* Print Jobs Tab */}
                {activeTab === 'prints' && (
                  <div className="space-y-4">
                    {printJobs.length === 0 ? (
                      <Card className="text-center py-12">
                        <CardContent>
                          <div className="text-muted-foreground">
                            <Printer className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-medium mb-2">No print jobs yet</h3>
                            <p>Your print history will appear here</p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      printJobs.map((job) => (
                        <Card key={job.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">{job.file_name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  Job ID: {job.id.substring(0, 8)}...
                                </p>
                              </div>
                              <Badge variant={
                                job.status === 'completed' ? 'default' :
                                job.status === 'printing' ? 'secondary' :
                                job.status === 'cancelled' ? 'destructive' : 'outline'
                              }>
                                {job.status}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                              <div>
                                <span className="text-muted-foreground">Pages:</span>
                                <span className="ml-2 font-medium">{job.pages}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Copies:</span>
                                <span className="ml-2 font-medium">{job.copies}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Cost:</span>
                                <span className="ml-2 font-medium">৳{Number(job.total_cost || 0).toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Submitted:</span>
                                <span className="ml-2 font-medium">
                                  {new Date(job.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            {job.notes && (
                              <div className="text-sm text-muted-foreground">
                                <strong>Notes:</strong> {job.notes}
                              </div>
                            )}

                            {job.file_url && (
                              <div className="mt-3 pt-3 border-t">
                                <button
                                  onClick={() => window.open(job.file_url, '_blank')}
                                  className="inline-flex items-center space-x-2 text-sm text-primary hover:underline"
                                >
                                  <Eye className="w-4 h-4" />
                                  <span>View File</span>
                                </button>
                              </div>
                            )}
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
                          <div className="text-muted-foreground">
                            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-medium mb-2">No bookings yet</h3>
                            <p>Your booking history will appear here</p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      bookings.map((booking) => (
                        <Card key={booking.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">
                                  {booking.shop_info?.shop_name || 'Print Shop'}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  Booking ID: {booking.id.substring(0, 8)}...
                                </p>
                              </div>
                              <Badge variant={
                                booking.status === 'confirmed' ? 'default' :
                                booking.status === 'cancelled' ? 'destructive' : 'outline'
                              }>
                                {booking.status}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span>{new Date(booking.slot_date).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span>{booking.slot_time}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span>{booking.shop_info?.address || 'Address not available'}</span>
                              </div>
                            </div>

                            {booking.notes && (
                              <div className="text-sm text-muted-foreground">
                                <strong>Notes:</strong> {booking.notes}
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
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default CustomerHistory;