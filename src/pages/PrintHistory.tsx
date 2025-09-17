import { useState, useEffect } from "react";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import JobFilters from "@/components/JobFilters";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, CheckCircle, Clock, CreditCard, Plus, Eye, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const PrintHistory = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [printJobs, setPrintJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchPrintJobs = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('print_jobs')
        .select('*')
        .eq('customer_id', user.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setPrintJobs(data || []);
    } catch (error) {
      console.error('Error fetching print jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrintJobs();
  }, [user]);

  const handleRefresh = () => {
    fetchPrintJobs();
  };

  const handleCreateJob = () => {
    navigate("/portal");
  };

  // Calculate statistics
  const totalJobs = printJobs.length;
  const completedJobs = printJobs.filter(job => job.status === 'completed').length;
  const activeJobs = printJobs.filter(job => ['pending', 'queued', 'printing'].includes(job.status)).length;
  const totalSpent = printJobs
    .filter(job => job.status === 'completed')
    .reduce((sum, job) => sum + Number(job.total_cost), 0);

  // Filter jobs based on active filter
  const filteredJobs = printJobs.filter(job => {
    if (activeFilter === 'all') return true;
    return job.status === activeFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'queued': return 'bg-blue-100 text-blue-800';
      case 'printing': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewFile = async (job: any) => {
    try {
      if (job.file_url) {
        window.open(job.file_url, '_blank');
      } else {
        // Create signed URL if not available
        const possibleFilePath = `${job.customer_id}/${job.file_name}`;
        const { data: urlData, error } = await supabase.storage
          .from('user-uploads')
          .createSignedUrl(possibleFilePath, 3600);
        
        if (error) throw error;
        if (urlData?.signedUrl) {
          window.open(urlData.signedUrl, '_blank');
        }
      }
    } catch (error) {
      console.error('Error viewing file:', error);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
      
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Print History & Jobs
          </h1>
          <p className="text-muted-foreground">
            Track your printing history and manage ongoing jobs
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Jobs"
            value={totalJobs.toString()}
            icon={FileText}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-100"
          />
          <StatCard
            title="Completed"
            value={completedJobs.toString()}
            icon={CheckCircle}
            iconColor="text-green-600"
            iconBgColor="bg-green-100"
          />
          <StatCard
            title="Active Jobs"
            value={activeJobs.toString()}
            icon={Clock}
            iconColor="text-orange-600"
            iconBgColor="bg-orange-100"
          />
          <StatCard
            title="Total Spent"
            value={`৳${totalSpent.toFixed(2)}`}
            icon={CreditCard}
            iconColor="text-purple-600"
            iconBgColor="bg-purple-100"
          />
        </div>

        {/* Job Filters */}
        <JobFilters
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onRefresh={handleRefresh}
        />

        {/* Jobs List or Empty State */}
        {loading ? (
          <div className="bg-card rounded-lg border border-border p-12 text-center">
            <div className="text-muted-foreground">Loading your print history...</div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No jobs found</h3>
            <p className="text-muted-foreground mb-6">
              {activeFilter === 'all' 
                ? "You haven't created any print jobs yet. Start by uploading documents to print."
                : `No ${activeFilter} jobs found. Try adjusting your filters or create a new print job.`
              }
            </p>
            <Button onClick={handleCreateJob} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Create New Print Job
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold">{job.file_name}</h3>
                        <Badge className={getStatusColor(job.status)}>
                          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Pages:</span> {job.pages}
                        </div>
                        <div>
                          <span className="font-medium">Copies:</span> {job.copies}
                        </div>
                        <div>
                          <span className="font-medium">Total Cost:</span> ৳{job.total_cost}
                        </div>
                        <div>
                          <span className="font-medium">Submitted:</span> {new Date(job.submitted_at).toLocaleDateString()}
                        </div>
                      </div>
                      {job.print_settings && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          <span className="font-medium">Settings:</span> {job.print_settings.paperSize} • {job.print_settings.colorType === 'color' ? 'Color' : 'B&W'} • {job.print_settings.paperQuality} quality
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleViewFile(job)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
    </ProtectedRoute>
  );
};

export default PrintHistory;