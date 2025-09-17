import { useState, useEffect } from 'react'
import { Button } from "./ui/button"
import { Switch } from "./ui/switch"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { useToast } from "./ui/use-toast"
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card"
import { supabase } from "@/integrations/supabase/client"

interface PrintQueueSettings {
  auto_accept: boolean
  notification_enabled: boolean
  queue_limit: number
}

interface PrintQueueSettingsProps {
  shopId: string
}

export function PrintQueueSettings({ shopId }: PrintQueueSettingsProps) {
  const [settings, setSettings] = useState<PrintQueueSettings>({
    auto_accept: false,
    notification_enabled: true,
    queue_limit: 10
  })
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchSettings()
  }, [shopId])

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('print_queue_settings')
        .select('*')
        .eq('shop_id', shopId)
        .single()

      if (error) throw error

      if (data) {
        setSettings({
          auto_accept: data.auto_accept,
          notification_enabled: data.notification_enabled,
          queue_limit: data.queue_limit
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  const updateSettings = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .rpc('upsert_print_queue_settings', {
          p_shop_id: shopId,
          p_auto_accept: settings.auto_accept,
          p_notification_enabled: settings.notification_enabled,
          p_queue_limit: settings.queue_limit
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Print queue settings updated successfully",
      })
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: "Failed to update print queue settings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Print Queue Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-accept">Auto Accept Print Jobs</Label>
          <Switch
            id="auto-accept"
            checked={settings.auto_accept}
            onCheckedChange={(checked) => 
              setSettings(prev => ({ ...prev, auto_accept: checked }))
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="notifications">Enable Notifications</Label>
          <Switch
            id="notifications"
            checked={settings.notification_enabled}
            onCheckedChange={(checked) => 
              setSettings(prev => ({ ...prev, notification_enabled: checked }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="queue-limit">Queue Limit</Label>
          <Input
            id="queue-limit"
            type="number"
            min={1}
            max={100}
            value={settings.queue_limit}
            onChange={(e) => 
              setSettings(prev => ({ 
                ...prev, 
                queue_limit: parseInt(e.target.value) || 10 
              }))
            }
          />
        </div>

        <Button 
          className="w-full" 
          onClick={updateSettings}
          disabled={isLoading}
        >
          {isLoading ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  )
}