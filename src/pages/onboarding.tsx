import React, { useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Camera, Upload, CheckCircle } from "lucide-react";

const slides = [
  {
    icon: Camera,
    title: "Your R&D companion.",
    description: "Capture evidence wherever you are."
  },
  {
    icon: Upload,
    title: "Snap, upload, done.",
    description: "Photos, documents, and notes sync automatically."
  },
  {
    icon: CheckCircle,
    title: "Stay organised effortlessly.",
    description: "Everything feeds into your consultant's system."
  }
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-12 text-center">
          <div className="w-32 h-32 mx-auto rounded-3xl accent-gradient flex items-center justify-center shadow-professional-md">
            <Icon className="w-16 h-16 text-white" strokeWidth={2.5} />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-slate-50 leading-tight">
              {slide.title}
            </h1>
            <p className="text-xl text-slate-400 leading-relaxed">
              {slide.description}
            </p>
          </div>

          <div className="flex gap-2 justify-center">
            {slides.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? "w-8 bg-[#ff6b35]"
                    : "w-2 bg-slate-700"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-3 safe-bottom bg-[#020617] border-t border-slate-800">
        {!isLastSlide ? (
          <Button 
            className="w-full h-14 text-lg font-semibold bg-[#ff6b35] hover:bg-[#ff8c42] text-slate-950 rounded-xl shadow-professional-md"
            onClick={handleNext}
          >
            Next
          </Button>
        ) : (
          <>
            <Button 
              className="w-full h-14 text-lg font-semibold bg-[#ff6b35] hover:bg-[#ff8c42] text-slate-950 rounded-xl shadow-professional-md"
              onClick={() => router.push("/auth/login")}
            >
              Log in
            </Button>
            <Button 
              className="w-full h-14 text-lg font-semibold bg-slate-900 hover:bg-slate-800 text-slate-100 rounded-xl border border-slate-700"
              onClick={() => router.push("/auth/signup")}
            >
              Sign up
            </Button>
          </>
        )}
      </div>
    </div>
  );
}