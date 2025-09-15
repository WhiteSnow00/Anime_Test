'use client';

import { useState } from 'react';
import Image from 'next/image';
import { 
  AnimeCard, 
  AnimeGrid,
  Button,
  SectionHeader,
  TabsContainer,
  TabsList,
  TabsTrigger,
  TabsContent,
  Modal,
  IntegratedCard,
  cx
} from '../AnimeComponents';
import { VideoPlayer } from '../VideoPlayer';
import { Navigation } from '../Navigation';

/**
 * Example: Complete Anime Page using Linaria + Tailwind
 * 
 * This example demonstrates:
 * 1. How to combine Tailwind utility classes with Linaria styled components
 * 2. Proper integration patterns for maintaining existing styles
 * 3. Component composition with both libraries
 * 4. Theme integration and responsive design
 */

export function AnimePageExample() {
  const [activeTab, setActiveTab] = useState('episodes');
  const [showModal, setShowModal] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);

  // Sample anime data
  const animeData = {
    title: 'Frieren: Beyond Journey\'s End',
    description: 'After the party of heroes defeated the Demon King, they restored peace to the land and returned to lives of solitude.',
    rating: 9.2,
    year: '2023',
    genres: ['Fantasy', 'Drama', 'Adventure'],
    episodes: 28,
    posterUrl: 'https://placehold.co/300x450',
    bannerUrl: 'https://placehold.co/1920x400'
  };

  const episodes = Array.from({ length: 12 }, (_, i) => ({
    number: i + 1,
    title: `Episode ${i + 1}`,
    thumbnail: 'https://placehold.co/320x180',
    duration: '24 min',
    aired: new Date(2023, 9, 1 + i * 7).toLocaleDateString()
  }));

  const relatedAnime = [
    { title: 'Violet Evergarden', posterUrl: 'https://placehold.co/200x300', rating: 8.5, year: '2018' },
    { title: 'Made in Abyss', posterUrl: 'https://placehold.co/200x300', rating: 8.4, year: '2017' },
    { title: 'Land of the Lustrous', posterUrl: 'https://placehold.co/200x300', rating: 7.9, year: '2017' },
    { title: 'Girls\' Last Tour', posterUrl: 'https://placehold.co/200x300', rating: 8.2, year: '2017' }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation - Linaria component */}
      <Navigation currentPath="/anime" />

      {/* Hero Banner - Combining Tailwind utilities with inline styles */}
      <div 
        className="relative h-[400px] w-full overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.8)), url(${animeData.bannerUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="container mx-auto">
            <h1 className="text-4xl font-bold text-white mb-2">{animeData.title}</h1>
            <div className="flex items-center gap-4 text-white/80">
              <span>{animeData.year}</span>
              <span>•</span>
              <span>{animeData.episodes} Episodes</span>
              <span>•</span>
              <span>⭐ {animeData.rating}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Anime Info */}
          <div className="lg:col-span-2">
            {/* Video Player */}
            {selectedEpisode && (
              <VideoPlayer
                src={`/video/episode-${selectedEpisode}.mp4`}
                title={`Episode ${selectedEpisode}`}
                hasPrevious={selectedEpisode > 1}
                hasNext={selectedEpisode < episodes.length}
                onPrevious={() => setSelectedEpisode(Math.max(1, selectedEpisode - 1))}
                onNext={() => setSelectedEpisode(Math.min(episodes.length, selectedEpisode + 1))}
              />
            )}

            {/* Description Card - IntegratedCard combines Tailwind + Linaria */}
            <IntegratedCard className="mt-6">
              <h2 className="text-xl font-semibold mb-3">Synopsis</h2>
              <p className="text-muted-foreground leading-relaxed">
                {animeData.description}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {animeData.genres.map(genre => (
                  <span 
                    key={genre}
                    className={cx(
                      'px-3 py-1 rounded-full text-sm',
                      'bg-primary/10 text-primary',
                      'hover:bg-primary/20 transition-colors'
                    )}
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </IntegratedCard>

            {/* Tabs Section - Linaria components */}
            <TabsContainer className="mt-8">
              <TabsList>
                <TabsTrigger 
                  active={activeTab === 'episodes'}
                  onClick={() => setActiveTab('episodes')}
                >
                  Episodes
                </TabsTrigger>
                <TabsTrigger 
                  active={activeTab === 'characters'}
                  onClick={() => setActiveTab('characters')}
                >
                  Characters
                </TabsTrigger>
                <TabsTrigger 
                  active={activeTab === 'reviews'}
                  onClick={() => setActiveTab('reviews')}
                >
                  Reviews
                </TabsTrigger>
              </TabsList>

              <TabsContent active={activeTab === 'episodes'}>
                <div className="grid gap-4">
                  {episodes.map(episode => (
                    <div 
                      key={episode.number}
                      className={cx(
                        'flex gap-4 p-4 rounded-lg',
                        'bg-card border border-border',
                        'hover:shadow-lg transition-all cursor-pointer',
                        'group'
                      )}
                      onClick={() => {
                        setSelectedEpisode(episode.number);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      <div className="relative w-32 h-20 rounded overflow-hidden flex-shrink-0">
                        <Image 
                          src={episode.thumbnail} 
                          alt={episode.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-white text-2xl">▶</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold group-hover:text-primary transition-colors">
                          {episode.title}
                        </h3>
                        <div className="text-sm text-muted-foreground mt-1">
                          {episode.duration} • {episode.aired}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent active={activeTab === 'characters'}>
                <div className="text-center py-12 text-muted-foreground">
                  Characters information coming soon...
                </div>
              </TabsContent>

              <TabsContent active={activeTab === 'reviews'}>
                <div className="text-center py-12 text-muted-foreground">
                  Reviews coming soon...
                </div>
              </TabsContent>
            </TabsContainer>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Action Buttons - Linaria Button component */}
            <div className="space-y-3">
              <Button variant="primary" fullWidth onClick={() => setShowModal(true)}>
                ▶ Watch Now
              </Button>
              <Button variant="secondary" fullWidth>
                + Add to List
              </Button>
              <Button variant="ghost" fullWidth>
                Share
              </Button>
            </div>

            {/* Anime Info Card */}
            <IntegratedCard>
              <h3 className="font-semibold mb-4">Information</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>Airing</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Episodes</dt>
                  <dd>{animeData.episodes}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Duration</dt>
                  <dd>24 min/ep</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Season</dt>
                  <dd>Fall 2023</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Studio</dt>
                  <dd>Madhouse</dd>
                </div>
              </dl>
            </IntegratedCard>

            {/* Related Anime Section */}
            <div>
              <SectionHeader>
                <h3 className="section-title">Related Anime</h3>
              </SectionHeader>
              <div className="space-y-4">
                {relatedAnime.map((anime, index) => (
                  <div 
                    key={index}
                    className="flex gap-3 cursor-pointer group"
                  >
                    <div className="relative w-16 h-20 rounded overflow-hidden flex-shrink-0">
                      <Image 
                        src={anime.posterUrl} 
                        alt={anime.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-2">
                        {anime.title}
                      </h4>
                      <div className="text-xs text-muted-foreground mt-1">
                        {anime.year} • ⭐ {anime.rating}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* More Like This Section - Using AnimeGrid */}
        <div className="mt-12">
          <SectionHeader>
            <h2 className="section-title">More Like This</h2>
            <div className="section-actions">
              <Button variant="ghost" size="sm">View All</Button>
            </div>
          </SectionHeader>
          
          <AnimeGrid columns={6}>
            {[...Array(6)].map((_, i) => (
              <AnimeCard
                key={i}
                title={`Anime Title ${i + 1}`}
                posterUrl="https://placehold.co/200x300"
                episode={12}
                totalEpisodes={24}
                year="2023"
                rating={8.5}
                genres={['Action', 'Fantasy', 'Adventure']}
                onClick={() => console.log('Clicked anime', i)}
              />
            ))}
          </AnimeGrid>
        </div>
      </div>

      {/* Modal Example */}
      <Modal 
        open={showModal} 
        onClose={() => setShowModal(false)}
        title="Select Episode"
      >
        <div className="grid grid-cols-4 gap-3">
          {episodes.map(ep => (
            <Button
              key={ep.number}
              variant={selectedEpisode === ep.number ? 'primary' : 'ghost'}
              onClick={() => {
                setSelectedEpisode(ep.number);
                setShowModal(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Ep {ep.number}
            </Button>
          ))}
        </div>
      </Modal>
    </div>
  );
}

/**
 * Integration Patterns Demonstrated:
 * 
 * 1. **Combining Classes**: Use cx() helper to combine Tailwind and conditional classes
 * 2. **IntegratedCard**: Shows how styled components can accept className prop
 * 3. **Layout with Tailwind**: Use Tailwind for responsive grids and spacing
 * 4. **Styling with Linaria**: Use Linaria for complex interactive components
 * 5. **Theme Variables**: Both libraries use CSS variables from globals.css
 * 6. **No Style Conflicts**: Linaria generates unique class names, avoiding collisions
 */