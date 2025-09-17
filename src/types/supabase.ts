export type PrintQueueSettings = {
  id: string
  user_id: string
  shop_id: string
  auto_accept: boolean
  notification_enabled: boolean
  queue_limit: number
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      print_queue_settings: {
        Row: PrintQueueSettings
        Insert: Omit<PrintQueueSettings, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<PrintQueueSettings>
      }
    }
    Functions: {
      upsert_print_queue_settings: {
        Args: {
          p_shop_id: string
          p_auto_accept?: boolean
          p_notification_enabled?: boolean
          p_queue_limit?: number
        }
        Returns: PrintQueueSettings
      }
    }
  }
}