import { useEffect, useState } from 'react';

interface BlueskyProfile {
  handle: string;
  displayName: string;
  avatar?: string;
  description?: string;
  followersCount?: number;
}

interface UserProfileCarouselProps {
  className?: string;
}

// Samples des vrais utilisateurs importés
const sampleHandles = [
  'jay.is.camp',
  'bomdia.bsky.social',
  'sebastianjanas.bsky.social',
  'willc.io',
  'hyperbulletin.com',
  'lunarhallow.bsky.social',
  'davidwbrown.com',
  'danielmateus.com',
  'walkoflife.bsky.social',
  'youneskkc.bsky.social',
  'demonbunni.bsky.social',
  'cafeolait.bsky.social'
];

export default function UserProfileCarousel({ className = '' }: UserProfileCarouselProps) {
  const [profiles, setProfiles] = useState<BlueskyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (profiles.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % profiles.length);
      }, 3000); // Change every 3 seconds

      return () => clearInterval(interval);
    }
  }, [profiles.length]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      
      // Fetch profiles from our API endpoint
      const response = await fetch('/api/bluesky-profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': (window as any).csrfToken || ''
        },
        body: JSON.stringify({ handles: sampleHandles.slice(0, 8) }) // First 8 users
      });

      if (response.ok) {
        const data = await response.json();
        setProfiles(data.profiles || []);
      } else {
        // Fallback to mock data if API fails
        setProfiles(generateMockProfiles());
      }
    } catch (error) {
      console.error('Failed to fetch Bluesky profiles:', error);
      // Fallback to mock data
      setProfiles(generateMockProfiles());
    } finally {
      setLoading(false);
    }
  };

  const generateMockProfiles = (): BlueskyProfile[] => {
    return sampleHandles.slice(0, 8).map((handle) => ({
      handle,
      displayName: handle.split('.')[0].charAt(0).toUpperCase() + handle.split('.')[0].slice(1),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${handle}&size=64`,
      description: `Creative professional on Bluesky`,
      followersCount: Math.floor(Math.random() * 1000) + 50
    }));
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center space-x-4 ${className}`}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="w-16 h-16 bg-gray-300 rounded-full"></div>
          </div>
        ))}
      </div>
    );
  }

  if (profiles.length === 0) {
    return null;
  }

  const visibleProfiles = profiles.slice(currentIndex, currentIndex + 4).concat(
    profiles.slice(0, Math.max(0, (currentIndex + 4) - profiles.length))
  );

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-center space-x-6 overflow-hidden">
        {visibleProfiles.map((profile, index) => (
          <div
            key={`${profile.handle}-${index}`}
            className="flex flex-col items-center space-y-2 transition-all duration-500 ease-in-out transform hover:scale-105"
          >
            <div className="relative group">
              <img
                src={profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.handle}&size=64`}
                alt={profile.displayName || profile.handle}
                className="w-16 h-16 rounded-full border-2 border-blue-500/20 group-hover:border-blue-500/50 transition-colors object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.handle}&size=64`;
                }}
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-20">
                {profile.displayName || profile.handle.split('.')[0]}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-20">
                @{profile.handle.split('.')[0]}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Indicators */}
      <div className="flex justify-center mt-4 space-x-2">
        {profiles.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentIndex 
                ? 'bg-blue-500' 
                : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
