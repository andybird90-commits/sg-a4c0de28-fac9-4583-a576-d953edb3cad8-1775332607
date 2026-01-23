import React, { useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Upload, FileText, CheckCircle } from "lucide-react";

const slides = [
  {
    icon: Camera,
    title: "Capture Evidence On The Go",
    description: "Take photos of prototypes, tests, and iterations as they happen. Never miss documenting your R&D work."
  },
  {
    icon: Upload,
    title: "Upload Documents Instantly",
    description: "Share technical specs, test results, and research documents directly from your device."
  },
  {
    icon: FileText,
    title: "Add Context & Notes",
    description: "Tag and describe your evidence to make it easy for your R&D team to process your claim."
  },
  {
    icon: CheckCircle,
    title: "Everything Syncs Automatically",
    description: "Your evidence is securely stored and ready for your R&D tax claim team to review."
  }
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      router.push("/home");
    }
  };

  const handleSkip = () => {
    router.push("/home");
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-12 pb-6">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <Icon className="w-12 h-12 text-blue-600 dark:text-blue-400" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {slide.title}
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                {slide.description}
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              {slides.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentSlide
                      ? "w-8 bg-blue-600"
                      : "w-2 bg-slate-300 dark:bg-slate-600"
                  }`}
                />
              ))}
            </div>

            <div className="w-full space-y-3 pt-6">
              <Button className="w-full" size="lg" onClick={handleNext}>
                {currentSlide === slides.length - 1 ? "Get Started" : "Next"}
              </Button>
              {currentSlide < slides.length - 1 && (
                <Button variant="ghost" className="w-full" onClick={handleSkip}>
                  Skip
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}