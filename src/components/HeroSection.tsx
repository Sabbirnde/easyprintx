import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Building } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export const HeroSection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleUserPortalClick = () => {
    if (user) {
      navigate("/portal");
    } else {
      navigate("/auth?type=user");
    }
  };

  const handleShopOwnerClick = () => {
    navigate("/auth?type=shop");
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-black">
      {/* 🔹 Animated Printer Icon */}




<div className="flex justify-center mt-10 mb-10">
  <img
    src="https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExY2FycGl0NXprdWUydzRtN29oYXB2Yzd2M2xzbGx2cTNnaXEwcDVidyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/bYThvpfFJDscDiRMhj/giphy.gif"
    alt="Animated Printer"
    className="rounded-full object-cover w-32 sm:w-40 md:w-48 lg:w-52 h-32 sm:h-40 md:h-48 lg:h-52"
  />
</div>



      {/* 🔹 Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent)]" />
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* 🔹 Content */}
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Main Heading */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-white mb-6 tracking-tight drop-shadow-lg">
          EasyPrintX: <span className="text-accent">PrintPilot</span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
          Hassle-free printing for students with{" "}
          <span className="text-accent font-semibold">EasyPrintX</span>.
        </p>

        {/* Description */}
        <p className="text-lg text-white/70 mb-12 max-w-4xl mx-auto leading-relaxed">
          A revolutionary SaaS platform connecting users with print shops through{" "}
          <span className="text-white font-semibold">intelligent scheduling</span>,{" "}
          <span className="text-white font-semibold">real-time queue management</span>, and{" "}
          <span className="text-white font-semibold">seamless geo-location services</span>.
        </p>

        {/* 🔹 Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
          <Button
            variant="hero"
            size="lg"
            className="group bg-accent hover:bg-accent/90 text-white shadow-xl shadow-accent/40"
            onClick={handleUserPortalClick}
          >
            <Users className="mr-2 h-5 w-5" />
            {user ? "User Portal" : "Sign In to Print"}
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
          <Button
            variant="hero"
            size="lg"
            className="group bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-500/40"
            onClick={handleShopOwnerClick}
          >
            <Building className="mr-2 h-5 w-5" />
            Shop Owner
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>





    </section>
  );
};
