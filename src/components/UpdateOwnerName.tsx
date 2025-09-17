import { useState } from 'react'
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { useToast } from "./ui/use-toast"
import { supabase } from "@/integrations/supabase/client"

export function UpdateOwnerName() {
  const [ownerName, setOwnerName] = useState('')
  const { toast } = useToast()

  const handleUpdateOwnerName = async () => {
    try {
      const { data, error } = await supabase
        .rpc('update_owner_name', {
          new_owner_name: ownerName
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Owner name updated successfully",
      })
      
      // Clear the input
      setOwnerName('')
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: "Failed to update owner name",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Update Owner Name</h2>
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Enter new owner name"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
        />
        <Button onClick={handleUpdateOwnerName}>
          Update
        </Button>
      </div>
    </div>
  )
}