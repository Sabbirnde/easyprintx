import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface ShopSyncStatus {
  hasPrivateData: boolean;
  hasPublicData: boolean;
  isActive: boolean;
  shopName: string;
}

export const ShopSyncChecker = () => {
  const { user, isShopOwner } = useAuth();
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<ShopSyncStatus | null>(null);
  const [fixing, setFixing] = useState(false);

  const checkSyncStatus = async () => {
    if (!user || !isShopOwner) return;

    setLoading(true);
    try {
      // Check private shop data
      const { data: privateData, error: privateError } = await supabase
        .from('shop_info')
        .select('shop_name')
        .eq('shop_owner_id', user.id)
        .maybeSingle();

      // Check public shop data
      const { data: publicData, error: publicError } = await supabase
        .from('public_shop_directory')
        .select('shop_name, is_active')
        .eq('shop_owner_id', user.id)
        .maybeSingle();

      if (privateError && privateError.code !== 'PGRST116') {
        throw privateError;
      }
      if (publicError && publicError.code !== 'PGRST116') {
        throw publicError;
      }

      setSyncStatus({
        hasPrivateData: !!privateData,
        hasPublicData: !!publicData,
        isActive: publicData?.is_active || false,
        shopName: privateData?.shop_name || publicData?.shop_name || 'Unknown Shop'
      });

    } catch (error) {
      console.error('Error checking sync status:', error);
      toast.error('Failed to check shop sync status');
    } finally {
      setLoading(false);
    }
  };

  const fixSyncIssues = async () => {
    if (!user || !syncStatus) return;

    setFixing(true);
    try {
      // If private data exists but public doesn't, create public entry
      if (syncStatus.hasPrivateData && !syncStatus.hasPublicData) {
        const { data: privateData } = await supabase
          .from('shop_info')
          .select('*')
          .eq('shop_owner_id', user.id)
          .single();

        if (privateData) {
          const { error } = await supabase
            .from('public_shop_directory')
            .insert({
              shop_owner_id: user.id,
              shop_name: privateData.shop_name,
              description: privateData.description || 'Quality printing services',
              address: privateData.address || 'Address not set',
              website_url: privateData.website_url,
              logo_url: privateData.logo_url,
              is_active: true
            });

          if (error) throw error;
          toast.success('Public shop listing created successfully!');
        }
      }

      // If public data exists but not active, activate it
      if (syncStatus.hasPublicData && !syncStatus.isActive) {
        const { error } = await supabase
          .from('public_shop_directory')
          .update({ is_active: true })
          .eq('shop_owner_id', user.id);

        if (error) throw error;
        toast.success('Shop listing activated successfully!');
      }

      // Refresh status
      await checkSyncStatus();

    } catch (error) {
      console.error('Error fixing sync issues:', error);
      toast.error('Failed to fix sync issues');
    } finally {
      setFixing(false);
    }
  };

  useEffect(() => {
    if (user && isShopOwner) {
      checkSyncStatus();
    }
  }, [user, isShopOwner]);

  if (!isShopOwner) return null;

  const needsFix = syncStatus && (
    (syncStatus.hasPrivateData && !syncStatus.hasPublicData) ||
    (syncStatus.hasPublicData && !syncStatus.isActive)
  );

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Shop Visibility Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Checking shop visibility...</span>
          </div>
        ) : syncStatus ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                {syncStatus.hasPrivateData ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                )}
                <span>Private shop data: {syncStatus.hasPrivateData ? 'Exists' : 'Missing'}</span>
              </div>
              <div className="flex items-center gap-2">
                {syncStatus.hasPublicData ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                )}
                <span>Public listing: {syncStatus.hasPublicData ? 'Exists' : 'Missing'}</span>
              </div>
              <div className="flex items-center gap-2">
                {syncStatus.isActive ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                )}
                <span>Visible to customers: {syncStatus.isActive ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Shop: {syncStatus.shopName}</span>
              </div>
            </div>

            {needsFix && (
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  Your shop is not visible to customers in "Find Shops". Click the button below to fix this.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={checkSyncStatus}
                disabled={loading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Status
              </Button>

              {needsFix && (
                <Button
                  onClick={fixSyncIssues}
                  disabled={fixing}
                  size="sm"
                >
                  {fixing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Make Shop Visible
                </Button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">No sync status available</p>
        )}
      </CardContent>
    </Card>
  );
};