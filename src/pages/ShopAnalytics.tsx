import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign,
  FileText,
  TrendingUp,
  TrendingDown,
  Users,
  BarChart3,
  Download
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import ShopHeader from "@/components/ShopHeader";

interface AnalyticsData {
  totalRevenue: number;
  revenueChange: number;
  totalJobs: number;
  jobsChange: number;
  avgJobValue: number;
  avgJobValueChange: number;
  uniqueCustomers: number;
  customersChange: number;
}

interface DailyPerformance {
  day: string;
  date: string;
  revenue: number;
  jobs: number;
}

interface ServiceData {
  name: string;
  count: number;
  percentage: number;
  color: string;
  revenue: number;
}

const ShopAnalytics = () => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('7');
  const [loading, setLoading] = useState(true);
  
  // Database-driven state
  const [revenue, setRevenue] = useState(0);
  const [revenueChange, setRevenueChange] = useState(0);
  const [jobsCount, setJobsCount] = useState(0);
  const [jobsChange, setJobsChange] = useState(0);
  const [averageJobValue, setAverageJobValue] = useState(0);
  const [avgJobValueChange, setAvgJobValueChange] = useState(0);
  const [uniqueCustomers, setUniqueCustomers] = useState(0);
  const [customersChange, setCustomersChange] = useState(0);
  const [dailyPerformance, setDailyPerformance] = useState<DailyPerformance[]>([]);
  const [topServices, setTopServices] = useState<ServiceData[]>([]);

  // Calculate date ranges for current period and previous period comparison
  const getDateRanges = () => {
    const days = parseInt(timeRange);
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);
    
    const prevEndDate = new Date(startDate);
    prevEndDate.setDate(prevEndDate.getDate() - 1);
    const prevStartDate = new Date(prevEndDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);
    
    return {
      current: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      previous: {
        start: prevStartDate.toISOString(),
        end: prevEndDate.toISOString()
      }
    };
  };

  const fetchAnalytics = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const dateRanges = getDateRanges();
      
      // Fetch current period data
      const { data: currentJobs, error: currentError } = await supabase
        .from('print_jobs')
        .select('id, total_cost, created_at, customer_id, customer_email, status')
        .eq('shop_owner_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', dateRanges.current.start)
        .lte('created_at', dateRanges.current.end);

      if (currentError) {
        console.error('Error fetching current analytics:', currentError);
        throw currentError;
      }

      // Fetch previous period data for comparison
      const { data: prevJobs, error: prevError } = await supabase
        .from('print_jobs')
        .select('id, total_cost, created_at, customer_id, customer_email, status')
        .eq('shop_owner_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', dateRanges.previous.start)
        .lte('created_at', dateRanges.previous.end);

      if (prevError) {
        console.error('Error fetching previous analytics:', prevError);
        // Don't throw error, just continue without comparison data
      }

      console.log(`[ShopAnalytics] Fetched ${currentJobs?.length || 0} current jobs and ${prevJobs?.length || 0} previous jobs`);

      if (!currentJobs || currentJobs.length === 0) {
        // Reset to empty state
        setRevenue(0);
        setRevenueChange(0);
        setJobsCount(0);
        setJobsChange(0);
        setAverageJobValue(0);
        setAvgJobValueChange(0);
        setUniqueCustomers(0);
        setCustomersChange(0);
        setDailyPerformance([]);
        setTopServices([]);
        setLoading(false);
        return;
      }

      // Calculate current period metrics
      const currentRevenue = currentJobs.reduce((sum, job) => sum + (job.total_cost || 0), 0);
      const currentJobsCount = currentJobs.length;
      const currentAvgJobValue = currentJobsCount > 0 ? currentRevenue / currentJobsCount : 0;
      const currentUniqueCustomers = new Set(currentJobs.map(job => job.customer_id)).size;

      // Calculate previous period metrics for comparison
      const prevRevenue = prevJobs?.reduce((sum, job) => sum + (job.total_cost || 0), 0) || 0;
      const prevJobsCount = prevJobs?.length || 0;
      const prevAvgJobValue = prevJobsCount > 0 ? prevRevenue / prevJobsCount : 0;
      const prevUniqueCustomers = prevJobs ? new Set(prevJobs.map(job => job.customer_id)).size : 0;

      // Calculate percentage changes
      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      const revChange = calculateChange(currentRevenue, prevRevenue);
      const jobsChg = calculateChange(currentJobsCount, prevJobsCount);
      const avgJobChg = calculateChange(currentAvgJobValue, prevAvgJobValue);
      const custChg = calculateChange(currentUniqueCustomers, prevUniqueCustomers);

      // Calculate daily performance
      const dailyData: { [key: string]: { revenue: number; jobs: number } } = {};
      
      currentJobs.forEach(job => {
        const date = new Date(job.created_at);
        const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        if (!dailyData[dayKey]) {
          dailyData[dayKey] = { revenue: 0, jobs: 0 };
        }
        
        dailyData[dayKey].revenue += job.total_cost || 0;
        dailyData[dayKey].jobs += 1;
      });

      // Convert to array and sort by date
      const dailyPerformanceData: DailyPerformance[] = Object.entries(dailyData)
        .map(([dateStr, data]) => {
          const date = new Date(dateStr);
          return {
            day: date.toLocaleDateString('en-US', { weekday: 'short' }),
            date: dateStr,
            revenue: data.revenue,
            jobs: data.jobs
          };
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate service breakdown
      const serviceData: { [key: string]: { count: number; revenue: number } } = {};
      
      currentJobs.forEach(job => {
        const serviceName = (job as any).service_type || 'Other';
        
        if (!serviceData[serviceName]) {
          serviceData[serviceName] = { count: 0, revenue: 0 };
        }
        
        serviceData[serviceName].count += 1;
        serviceData[serviceName].revenue += job.total_cost || 0;
      });

      // Convert to array and calculate percentages
      const totalServiceJobs = currentJobsCount;
      const serviceColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316'];
      
      const topServicesData: ServiceData[] = Object.entries(serviceData)
        .map(([name, data], index) => ({
          name,
          count: data.count,
          revenue: data.revenue,
          percentage: totalServiceJobs > 0 ? Math.round((data.count / totalServiceJobs) * 100) : 0,
          color: serviceColors[index % serviceColors.length]
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6); // Top 6 services

      // Update state
      setRevenue(currentRevenue);
      setRevenueChange(revChange);
      setJobsCount(currentJobsCount);
      setJobsChange(jobsChg);
      setAverageJobValue(currentAvgJobValue);
      setAvgJobValueChange(avgJobChg);
      setUniqueCustomers(currentUniqueCustomers);
      setCustomersChange(custChg);
      setDailyPerformance(dailyPerformanceData);
      setTopServices(topServicesData);

    } catch (error) {
      console.error('Analytics fetch error:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, user]);

  const exportReport = () => {
    // Export real analytics data
    const csvContent = `Metric,Value,Change\nTotal Revenue,$${revenue.toFixed(2)},${revenueChange.toFixed(1)}%\nTotal Jobs,${jobsCount},${jobsChange.toFixed(1)}%\nAvg Job Value,$${averageJobValue.toFixed(2)},${avgJobValueChange.toFixed(1)}%\nUnique Customers,${uniqueCustomers},${customersChange.toFixed(1)}%`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shop-analytics-${timeRange}-days.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <ShopHeader currentPage="Analytics" />

      <main className="container mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Shop Analytics
            </h1>
            <p className="text-muted-foreground">
              Monitor your print shop performance and insights
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={exportReport}>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">${revenue.toFixed(2)}</p>
                  <div className="flex items-center mt-1">
                    {revenueChange >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-500 mr-1" />
                    )}
                    <span className={`text-xs ${
                      revenueChange >= 0 ? "text-green-500" : "text-red-500"
                    }`}>
                      {revenueChange >= 0 ? '+' : ''}{revenueChange.toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">vs last week</span>
                  </div>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Jobs</p>
                  <p className="text-2xl font-bold">{jobsCount}</p>
                  <div className="flex items-center mt-1">
                    {jobsChange >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-500 mr-1" />
                    )}
                    <span className={`text-xs ${
                      jobsChange >= 0 ? "text-green-500" : "text-red-500"
                    }`}>
                      {jobsChange >= 0 ? '+' : ''}{jobsChange.toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">vs last week</span>
                  </div>
                </div>
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Job Value</p>
                  <p className="text-2xl font-bold">${averageJobValue.toFixed(2)}</p>
                  <div className="flex items-center mt-1">
                    {avgJobValueChange >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-500 mr-1" />
                    )}
                    <span className={`text-xs ${
                      avgJobValueChange >= 0 ? "text-green-500" : "text-red-500"
                    }`}>
                      {avgJobValueChange >= 0 ? '+' : ''}{avgJobValueChange.toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">vs last week</span>
                  </div>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Unique Customers</p>
                  <p className="text-2xl font-bold">{uniqueCustomers}</p>
                  <div className="flex items-center mt-1">
                    {customersChange >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-500 mr-1" />
                    )}
                    <span className={`text-xs ${
                      customersChange >= 0 ? "text-green-500" : "text-red-500"
                    }`}>
                      {customersChange >= 0 ? '+' : ''}{customersChange.toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">vs last week</span>
                  </div>
                </div>
                <Users className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Performance</CardTitle>
              <div className="flex space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-primary rounded"></div>
                  <span>Revenue</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>Jobs</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dailyPerformance.map((day, index) => (
                  <div key={day.day} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium w-12">{day.day}</span>
                      <div className="flex space-x-4 text-xs text-muted-foreground">
                        <span>${day.revenue}</span>
                        <span>{day.jobs} jobs</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Progress 
                        value={(day.revenue / Math.max(...dailyPerformance.map(d => d.revenue))) * 100} 
                        className="h-2 bg-primary/20"
                      />
                      <Progress 
                        value={(day.jobs / Math.max(...dailyPerformance.map(d => d.jobs))) * 100} 
                        className="h-2 bg-blue-500/20"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Services */}
          <Card>
            <CardHeader>
              <CardTitle>Top Services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topServices.map((service, index) => (
                  <div key={service.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${service.color}`}></div>
                        <span className="text-sm font-medium">{service.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{service.count}</div>
                        <div className="text-xs text-muted-foreground">{service.percentage}%</div>
                      </div>
                    </div>
                    <Progress value={service.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ShopAnalytics;