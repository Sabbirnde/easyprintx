import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Users, Store } from 'lucide-react';

const ShopOwnerDebugger = () => {
  const [shops, setShops] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get shops
      const { data: shopsData, error: shopsError } = await supabase
        .from('public_shop_directory')
        .select('*')
        .eq('is_active', true);

      // Get profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (shopsError) {
        console.error('Shops error:', shopsError);
      } else {
        setShops(shopsData || []);
      }

      if (profilesError) {
        console.error('Profiles error:', profilesError);
      } else {
        setProfiles(profilesData || []);
      }

      console.log('Debug - Shops:', shopsData);
      console.log('Debug - Profiles:', profilesData);
    } catch (error) {
      console.error('Debug fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getOwnerName = (shopOwnerId: string) => {
    const profile = profiles.find(p => p.user_id === shopOwnerId);
    return profile?.full_name || 'Unknown Owner';
  };

  return (
    <Card className="w-full mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Shop Owner Debug Info
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Store className="w-4 h-4" />
                Shops ({shops.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {shops.map((shop, idx) => (
                  <div key={idx} className="p-2 bg-muted rounded text-sm">
                    <div><strong>Name:</strong> {shop.shop_name}</div>
                    <div><strong>Owner ID:</strong> {shop.shop_owner_id}</div>
                    <div><strong>Owner Name:</strong> {getOwnerName(shop.shop_owner_id)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Profiles ({profiles.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {profiles.map((profile, idx) => (
                  <div key={idx} className="p-2 bg-muted rounded text-sm">
                    <div><strong>User ID:</strong> {profile.user_id}</div>
                    <div><strong>Name:</strong> {profile.full_name || 'No name'}</div>
                    <div><strong>Phone:</strong> {profile.phone || 'No phone'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {shops.length === 0 && (
            <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-yellow-800">No shops found in database</p>
              <p className="text-sm text-yellow-600">Create some shop owners and shops to see them here</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ShopOwnerDebugger;