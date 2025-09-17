declare module 'lucide-react' {
  import { ComponentType, SVGProps } from 'react';
  
  interface IconProps extends SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
  }
  
  type Icon = ComponentType<IconProps>;
  
  export const ArrowRight: Icon;
  export const Users: Icon;
  export const Building: Icon;
  export const Download: Icon;
  export const Home: Icon;
  export const Mail: Icon;
  export const Lock: Icon;
  export const User: Icon;
  export const Eye: Icon;
  export const EyeOff: Icon;
  export const MapPin: Icon;
  export const Clock: Icon;
  export const Star: Icon;
  export const Phone: Icon;
  export const Search: Icon;
  export const Filter: Icon;
  export const Printer: Icon;
  export const Zap: Icon;
  export const Navigation: Icon;
  export const CheckCircle: Icon;
  export const Calendar: Icon;
  export const RefreshCw: Icon;
  export const AlertTriangle: Icon;
  export const Loader2: Icon;
  export const Database: Icon;
  export const Store: Icon;
  export const LayoutDashboard: Icon;
  export const PrinterIcon: Icon;
  export const BarChart3: Icon;
  export const FileText: Icon;
  export const DollarSign: Icon;
  export const Settings: Icon;
  export const LogOut: Icon;
  export const Activity: Icon;
  export const TrendingUp: Icon;
  export const TrendingDown: Icon;
  export const Info: Icon;
  export const Wrench: Icon;
  export const Bell: Icon;
  export const RotateCcw: Icon;
  export const Save: Icon;
  export const ListOrdered: Icon;
  export const Upload: Icon;
  export const File: Icon;
  export const Image: Icon;
  export const Trash2: Icon;
  export const XCircle: Icon;
  export const X: Icon;
  export const PlayCircle: Icon;
  export const PauseCircle: Icon;
  export const AlertCircle: Icon;
  export const Timer: Icon;
  
  // Add more icons as needed
  const _default: { [key: string]: Icon };
  export default _default;
}