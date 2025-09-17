import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Clock, Star, Phone, Search, Filter, Download, Printer, Zap, Navigation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getPricingRules, calculateMultipleFilesCost, formatCurrency } from "@/utils/pricingCalculations";
import ShopAvailability from "@/components/ShopAvailability";
import InstantBooking from "@/components/InstantBooking";
import useGeolocation from "@/hooks/useGeolocation";

const FindShops = () => {
  const [printShops, setPrintShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [maxDistance, setMaxDistance] = useState([5]);
  const [minRating, setMinRating] = useState("any");
  const [priceRange, setPriceRange] = useState("all");
  const [sortBy, setSortBy] = useState("distance");
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { userLocation, loading: locationLoading, error: locationError, requestLocation, calculateDistance } = useGeolocation();
  
  // Get uploaded files and print settings from navigation state
  const uploadedFiles = location.state?.files || [];
  const printSettings = location.state?.printSettings || {
    copies: 1,
    paperSize: 'A4',
    colorType: 'blackwhite',
    paperQuality: 'standard'
  };
  const totalCost = location.state?.totalCost || 0;

  // Fetch print shops from database
  useEffect(() => {
  const fetchShops = async () => {
    try {
      console.log('🔍 Fetching shops from public_shop_directory...');
      
      // First, get all active shops
      const { data: shops, error: shopError } = await supabase
        .from('public_shop_directory')
        .select('*')
        .eq('is_active', true);

      if (shopError) {
        console.error('❌ Error fetching shops:', shopError);
        throw shopError;
      }

      console.log('✅ Raw shop data from database:', shops);
      console.log(`📊 Found ${shops?.length || 0} active shops in database`);

      // Get all unique shop owner IDs
      const ownerIds = [...new Set(shops?.map(shop => shop.shop_owner_id) || [])];
      
      // Fetch profile information for shop owners
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name')
        .in('user_id', ownerIds);

      if (profileError) {
        console.warn('⚠️ Could not fetch owner profiles:', profileError);
      }

      console.log('👥 Owner profiles:', profiles);
      
      // Transform database data to match UI expectations
      const transformedShops = shops?.map(shop => {
        // Find the matching profile for this shop owner
        const ownerProfile = profiles?.find(profile => profile.user_id === shop.shop_owner_id);
        
        // Simulate shop coordinates (in a real app, these would be stored in the database)
        const shopCoords = {
          lat: 40.7128 + (Math.random() - 0.5) * 0.1, // Around NYC
          lng: -74.0060 + (Math.random() - 0.5) * 0.1
        };
        
        const distance = userLocation ? calculateDistance(shopCoords.lat, shopCoords.lng) : 0;
        
        return {
          id: shop.id,
          name: shop.shop_name,
          ownerName: ownerProfile?.full_name || 'Shop Owner',
          address: shop.address || 'Address not provided',
          phone: 'Contact via booking', // Don't expose private phone numbers
          rating: shop.rating || 4.5,
          isOpen: true, // Will be calculated by ShopAvailability component
          openHours: "Check business hours",
          services: shop.services_offered || ["Printing Services"],
          coordinates: [shopCoords.lat, shopCoords.lng],
          distance: distance,
          shop_owner_id: shop.shop_owner_id,
          description: shop.description || 'Professional printing services',
          business_hours: shop.business_hours
        };
      }) || [];
      
      console.log('🏪 Transformed shop data for UI:', transformedShops);
      setPrintShops(transformedShops);
    } catch (error) {
      console.error('Error fetching shops:', error);
      toast({
        title: "Error",
        description: "Failed to load print shops",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

    fetchShops();
  }, [toast]);

  const getDirections = (shop: any) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(shop.address)}`;
    window.open(url, '_blank');
  };

  const handleSelectShop = async (shop: any) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to submit print jobs",
        variant: "destructive"
      });
      return;
    }

    if (uploadedFiles.length === 0) {
      toast({
        title: "No files to print",
        description: "Please upload files first",
        variant: "destructive"
      });
      navigate('/portal');
      return;
    }

    setUploading(true);
    
    try {
      // Get shop's pricing rules
      const pricingRules = await getPricingRules(shop.shop_owner_id);
      
      // Create print jobs for each file
      const printJobs = await Promise.all(
        uploadedFiles.map(async (file: any) => {
          const jobDetails = {
            pages: file.pages || 1,
            copies: printSettings.copies,
            colorType: printSettings.colorType,
            paperQuality: printSettings.paperQuality
          };
          const fileCost = calculateMultipleFilesCost([{ pages: file.pages || 1 }], jobDetails, pricingRules);
          
          const printId = `PJ${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
          
          const { data, error } = await supabase
            .from('print_jobs')
            .insert({
              shop_owner_id: shop.shop_owner_id,
              customer_id: user.id,
              file_name: file.name,
              file_url: file.url,
              pages: file.pages || 1,
              copies: printSettings.copies,
              color_pages: printSettings.colorType === 'color' ? (file.pages || 1) : 0,
              total_cost: fileCost,
              status: 'pending',
              customer_name: user.user_metadata?.full_name || user.email,
              customer_email: user.email,
              print_settings: {
                paperSize: printSettings.paperSize,
                colorType: printSettings.colorType,
                paperQuality: printSettings.paperQuality,
                copies: printSettings.copies
              },
              notes: `Print job for ${shop.name} - ${printSettings.paperSize}, ${printSettings.colorType === 'color' ? 'Color' : 'B&W'}, ${printSettings.paperQuality} quality`
            })
            .select()
            .single();

          if (error) throw error;
          return { ...data, printId };
        })
      );

      toast({
        title: "Print jobs submitted!",
        description: `Your files have been sent to ${shop.name}. Total cost: ৳${totalCost.toFixed(2)}. Print IDs: ${printJobs.map(job => job.printId).join(', ')}`,
      });
      
      navigate('/history');
      
    } catch (error) {
      console.error('Error submitting print jobs:', error);
      toast({
        title: "Error",
        description: "Failed to submit print jobs. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const filteredShops = printShops.filter(shop => {
    const matchesSearch = shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         shop.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         shop.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         shop.services.some(service => service.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesRating = minRating === "any" || shop.rating >= parseFloat(minRating);
    const matchesOpenStatus = !openNowOnly || shop.isOpen;
    const matchesDistance = !userLocation || shop.distance <= maxDistance[0];
    
    return matchesSearch && matchesRating && matchesOpenStatus && matchesDistance;
  }).sort((a, b) => {
    // Sort by different criteria
    switch (sortBy) {
      case 'distance':
        return (a.distance || 999) - (b.distance || 999);
      case 'rating':
        return b.rating - a.rating;
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Find Print Shops</h1>
              <p className="text-muted-foreground">
                Discover nearby print shops with real-time availability and instant booking
              </p>
            </div>
            
            {/* Location Status */}
            <div className="flex items-center gap-2">
              {locationLoading ? (
                <Badge variant="outline" className="flex items-center gap-1">
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Getting location...
                </Badge>
              ) : userLocation ? (
                <Badge variant="default" className="flex items-center gap-1">
                  <Navigation className="w-3 h-3" />
                  Location enabled
                </Badge>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={requestLocation}
                  className="flex items-center gap-1"
                >
                  <Navigation className="w-3 h-3" />
                  Enable Location
                </Button>
              )}
            </div>
          </div>
          
          {/* Ready to Print Section */}
          {uploadedFiles.length > 0 && (
            <Card className="bg-primary/5 border-primary/20 mb-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Printer className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Ready to Print</h3>
                      <p className="text-sm text-muted-foreground">
                        {uploadedFiles.length} document(s) • {printSettings.copies} cop{printSettings.copies > 1 ? 'ies' : 'y'} • {printSettings.paperSize} • {printSettings.colorType === 'color' ? 'Color' : 'B&W'} • Total: ৳{totalCost.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {uploadedFiles.slice(0, 2).map((file: any, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name}
                      </Badge>
                    ))}
                    {uploadedFiles.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{uploadedFiles.length - 2} more
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Search */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search shops, owners, services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-base">
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Max Distance */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Max Distance: {maxDistance[0]} km</label>
                  <Slider
                    value={maxDistance}
                    onValueChange={setMaxDistance}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Minimum Rating */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Minimum Rating</label>
                  <Select value={minRating} onValueChange={setMinRating}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any Rating</SelectItem>
                      <SelectItem value="4.5">4.5+ Stars</SelectItem>
                      <SelectItem value="4.0">4.0+ Stars</SelectItem>
                      <SelectItem value="3.5">3.5+ Stars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Price Range</label>
                  <Select value={priceRange} onValueChange={setPriceRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Prices</SelectItem>
                      <SelectItem value="low">$ (Low)</SelectItem>
                      <SelectItem value="medium">$$ (Medium)</SelectItem>
                      <SelectItem value="high">$$$ (High)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort By */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sort By</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="distance">Distance</SelectItem>
                      <SelectItem value="rating">Rating</SelectItem>
                      <SelectItem value="price">Price</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Open Now Only */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="open-now"
                    checked={openNowOnly}
                    onCheckedChange={(checked) => setOpenNowOnly(checked as boolean)}
                  />
                  <label htmlFor="open-now" className="text-sm font-medium cursor-pointer">
                    Open now only
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Found {filteredShops.length} print shops</h2>
              
              {/* Sort Options */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sort by:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="distance">Distance</SelectItem>
                    <SelectItem value="rating">Rating</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="text-muted-foreground">Loading print shops...</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {filteredShops.map((shop) => (
                <Card 
                  key={shop.id} 
                  className={`cursor-pointer transition-colors hover:shadow-md ${
                    selectedShop?.id === shop.id ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setSelectedShop(shop)}
                >
                  <CardContent className="p-4">
                    {/* Row 1: Shop Name and Rating */}
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold text-lg">{shop.name}</h3>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{shop.rating}</span>
                      </div>
                    </div>
                    
                    {/* Row 2: Address and Opening Hours on same row */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4" />
                          <span>{shop.address}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span>{shop.openHours}</span>
                        </div>
                      </div>
                    </div>

                    {/* Service Badges */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {shop.services.slice(0, 3).map((service) => (
                        <Badge key={service} variant="secondary" className="text-xs">
                          {service}
                        </Badge>
                      ))}
                      {shop.services.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{shop.services.length - 3} more
                        </Badge>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="w-full"
                        onClick={() => handleSelectShop(shop)}
                      >
                        Submit Job
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate(`/book-slot/${shop.id}`, { 
                          state: { files: uploadedFiles, printSettings, totalCost } 
                        })}
                      >
                        Book Slot
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="w-full"
                        onClick={() => getDirections(shop)}
                      >
                        <MapPin className="w-3 h-3 mr-1" />
                        Directions
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                ))}
              </div>
            )}

            {!loading && filteredShops.length === 0 && (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="text-muted-foreground">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No print shops found</h3>
                    <p>Try adjusting your search criteria or filters</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default FindShops;