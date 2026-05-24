import { useState } from 'react';
import { API_BASE_URL } from '../config';

interface CoverImageProps {
  src?: string;
  alt: string;
  category?: string;
  className?: string;
  titleSeed?: string; // Used to pick a unique image per offer
}

// Each category has multiple unique Unsplash images so every offer looks different
const CATEGORY_IMAGES: Record<string, string[]> = {
  food: [
    'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80', // Premium Indian Thali
    'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80', // Royal Biryani / Indian Dining
    'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&auto=format&fit=crop&q=80', // Craft Cocktail & Tapas Bar
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80', // Elegant Bistro Dinner
    'https://images.unsplash.com/photo-1559813783-a9d7010ee3cf?w=800&auto=format&fit=crop&q=80', // Gourmet Appetizers
  ],
  gym: [
    'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&auto=format&fit=crop&q=80', // Luxury Gym Floor
    'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80', // High-end weights barbell lift
    'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800&auto=format&fit=crop&q=80', // Premium dumbbells rack (No people)
    'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=800&auto=format&fit=crop&q=80', // Olympic size swimming pool
    'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=800&auto=format&fit=crop&q=80', // High-tech spin class
  ],
  spa: [
    'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&auto=format&fit=crop&q=80', // Lavender and massage stones (No people)
    'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=800&auto=format&fit=crop&q=80', // Luxury Spa Therapy Room (Empty)
    'https://images.unsplash.com/photo-1600334188221-3dfd5d68fe3a?w=800&auto=format&fit=crop&q=80', // Fragrant towels, bamboo, candles, oils (No people)
    'https://images.unsplash.com/photo-1537861295351-76bb831ece99?w=800&auto=format&fit=crop&q=80', // Wooden sauna room (Empty)
    'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=800&auto=format&fit=crop&q=80', // Serene wellness resort pool (Empty)
  ],
  clinic: [
    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=80', // Advanced clinical checkup technology
    'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=800&auto=format&fit=crop&q=80', // Doctor consultation desk
    'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80', // Modern clinical lobby / consultation room (No people)
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80', // High-end medical diagnostic equipment
    'https://images.unsplash.com/photo-1579153196743-4a751b7f63b9?w=800&auto=format&fit=crop&q=80', // Modern pathology diagnostic screening
  ],
  coaching: [
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80', // Codecraft developer laboratory
    'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=80', // Modern tech coding masterclass auditorium
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80', // Programmers collaborating
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80', // Interactive bootcamp lab
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80', // Advanced code editor on screen
  ],
  default: [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1535557597501-0fee0a500c57?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&auto=format&fit=crop&q=80',
  ],
};

// Hash function to pick a deterministic but unique image from the list per offer
function pickImage(images: string[], seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return images[Math.abs(hash) % images.length];
}

export default function CoverImage({ src, alt, category, className = "w-full h-full object-cover", titleSeed = '' }: CoverImageProps) {
  const [error, setError] = useState(false);

  const renderFallback = () => {
    const cat = category?.toLowerCase() || '';
    let imageList = CATEGORY_IMAGES.default;

    if (cat.includes('food') || cat.includes('lunch') || cat.includes('dinner') || cat.includes('happy') || cat.includes('bistro') || cat.includes('cafe') || cat.includes('dining')) {
      imageList = CATEGORY_IMAGES.food;
    } else if (cat.includes('gym') || cat.includes('fitness') || cat.includes('workout') || cat.includes('turf') || cat.includes('sports')) {
      imageList = CATEGORY_IMAGES.gym;
    } else if (cat.includes('spa') || cat.includes('salon') || cat.includes('beauty') || cat.includes('wellness')) {
      imageList = CATEGORY_IMAGES.spa;
    } else if (cat.includes('clinic') || cat.includes('health') || cat.includes('doctor')) {
      imageList = CATEGORY_IMAGES.clinic;
    } else if (cat.includes('coaching') || cat.includes('class') || cat.includes('learn') || cat.includes('edu')) {
      imageList = CATEGORY_IMAGES.coaching;
    }

    // Pick a unique image using the offer title as seed — ensures every offer gets a different picture
    const imageUrl = pickImage(imageList, titleSeed || alt);

    return (
      <div className="w-full h-full relative overflow-hidden">
        {/* Background Image backdrop */}
        <img
          src={imageUrl}
          alt={category}
          className="absolute inset-0 w-full h-full object-cover scale-105 transition-transform duration-700"
        />

        {/* Subtle vignette/bottom gradient for tag legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10"></div>
      </div>
    );
  };

  if (error || !src || src.startsWith(API_BASE_URL)) {
    return renderFallback();
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}
