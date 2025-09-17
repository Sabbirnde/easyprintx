import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw } from "lucide-react";

interface JobFiltersProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onRefresh: () => void;
}

const JobFilters = ({ activeFilter, onFilterChange, onRefresh }: JobFiltersProps) => {
  const filters = [
    { key: "all", label: "All Jobs", count: 0 },
    { key: "pending", label: "Pending", count: 0 },
    { key: "in-progress", label: "In Progress", count: 0 },
    { key: "ready", label: "Ready For Pickup", count: 0 },
    { key: "completed", label: "Completed", count: 0 },
    { key: "cancelled", label: "Cancelled", count: 0 },
  ];

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-1">
        {filters.map((filter) => (
          <Button
            key={filter.key}
            variant={activeFilter === filter.key ? "default" : "ghost"}
            className={`${
              activeFilter === filter.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => onFilterChange(filter.key)}
          >
            {filter.label} ({filter.count})
          </Button>
        ))}
      </div>
      
      <div className="flex items-center space-x-3">
        <Select defaultValue="date">
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Sort by Date</SelectItem>
            <SelectItem value="status">Sort by Status</SelectItem>
            <SelectItem value="amount">Sort by Amount</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
    </div>
  );
};

export default JobFilters;