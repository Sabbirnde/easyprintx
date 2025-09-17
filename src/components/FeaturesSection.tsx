import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Clock, 
  MapPin, 
  Activity, 
  Users, 
  BarChart3, 
  Lock 
} from "lucide-react";

export const FeaturesSection = () => {
  const features = [
    {
      icon: Clock,
      title: "Smart Print Scheduling",
      description: "Book 10-minute slots at nearby print shops with real-time availability"
    },
    {
      icon: MapPin,
      title: "Geo-Location Discovery",
      description: "Find the nearest print shops with interactive map integration"
    },
    {
      icon: Activity,
      title: "Real-Time Queue Management",
      description: "Live updates on job status and queue position"
    },
    {
      icon: Users,
      title: "Multi-Portal System",
      description: "Separate dashboards for users, shop owners, and administrators"
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Comprehensive insights for shop optimization and revenue tracking"
    },
    {
      icon: Lock,
      title: "Enterprise Security",
      description: "Bank-level security with encrypted file storage and JWT authentication"
    }
  ];

  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Enterprise-Grade Printing Platform
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Built for scalability with modern microservices architecture, real-time synchronization, 
            and comprehensive business intelligence.
          </p>
        </div>
        
        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="group hover:shadow-card transition-all duration-300 hover:scale-105 border-border/50 hover:border-primary/20"
            >
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};