import { Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface Testimonial {
  id: number;
  name: string;
  role: string;
  content: string;
  avatar?: string | null;
  rating?: number;
}

interface TestimonialCarouselProps {
  testimonials: Testimonial[];
  speed?: number; // pixels per second
  pauseOnHover?: boolean;
  className?: string;
}

export function TestimonialCarousel({
  testimonials,
  speed = 50,
  pauseOnHover = true,
  className,
}: TestimonialCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const animationRef = useRef<number | null>(null);

  // Duplicate testimonials for seamless loop
  const duplicatedTestimonials = [...testimonials, ...testimonials];

  useEffect(() => {
    if (!scrollRef.current || isPaused) return;

    const scrollContainer = scrollRef.current;
    const singleSetWidth = scrollContainer.scrollWidth / 2;

    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;

      setScrollPosition((prev) => {
        const newPosition = prev + speed * deltaTime;
        // Reset to start when we've scrolled through one set
        if (newPosition >= singleSetWidth) {
          return newPosition - singleSetWidth;
        }
        return newPosition;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPaused, speed]);

  return (
    <div
      className={cn("relative w-full overflow-hidden", className)}
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}>
      {/* Gradient overlays for smooth edges */}
      <div className="pointer-events-none absolute top-0 left-0 z-10 h-full w-20 bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-900/50" />
      <div className="pointer-events-none absolute top-0 right-0 z-10 h-full w-20 bg-gradient-to-l from-slate-50 to-transparent dark:from-slate-900/50" />

      {/* Scrolling container */}
      <div
        ref={scrollRef}
        className="flex gap-6"
        style={{ transform: `translateX(-${scrollPosition}px)` }}>
        {duplicatedTestimonials.map((testimonial, index) => (
          <div
            key={`${testimonial.id}-${index}`}
            className="w-[350px] flex-shrink-0 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            {/* Header */}
            <div className="mb-4 flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-[#DCEEFF] dark:border-[#0047AB]/50">
                {testimonial.avatar ? (
                  <img src={testimonial.avatar} alt={testimonial.name} />
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-[#0047AB] to-[#007BFF] text-white">
                    {testimonial.name.charAt(0)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white">{testimonial.name}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">{testimonial.role}</p>
              </div>
            </div>

            {/* Rating */}
            <div className="mb-3 flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-4 w-4",
                    star <= (testimonial.rating || 5)
                      ? "fill-[#FFD700] text-[#FFD700]"
                      : "fill-slate-200 text-slate-200 dark:fill-slate-600 dark:text-slate-600"
                  )}
                />
              ))}
            </div>

            {/* Content */}
            <p className="line-clamp-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              "{testimonial.content}"
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
