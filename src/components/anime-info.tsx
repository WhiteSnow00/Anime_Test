import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Rating } from '@/components/rating';
import type { Anime } from '@/data/anime';
import { Calendar, Clapperboard, Clock, List, Star, Tv } from 'lucide-react';

interface AnimeInfoProps {
  anime: Omit<Anime, 'episodes'>;
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Icon className="w-4 h-4" />
        {label}
      </dt>
      <dd className="mt-1 text-base font-semibold text-foreground">{value}</dd>
    </div>
  );
}

export function AnimeInfo({ anime }: AnimeInfoProps) {
  return (
    <Card className="w-full shadow-lg overflow-hidden rounded-lg">
      <div className="grid md:grid-cols-12 gap-0 md:gap-6 bg-card">
        <div className="md:col-span-4 lg:col-span-3">
          <div className="relative aspect-[2/3] w-full">
            <Image
              src={anime.posterUrl}
              alt={`Poster for ${anime.title}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 33vw, 25vw"
              data-ai-hint="anime girl"
            />
          </div>
        </div>
        <div className="md:col-span-8 lg:col-span-9 p-6">
          <h1 className="text-3xl lg:text-4xl font-bold font-headline text-primary">{anime.title}</h1>
          <p className="text-md lg:text-lg text-muted-foreground mb-4">
            {anime.alternativeTitles.japanese} / {anime.alternativeTitles.english}
          </p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {anime.genres.map((genre) => (
              <Badge key={genre} variant="secondary" className="text-sm cursor-pointer hover:bg-primary/20 transition-colors">
                {genre}
              </Badge>
            ))}
          </div>

          <Card className="bg-background/50 mb-6 border-none shadow-none">
            <CardContent className="p-0">
              <p className="text-sm text-foreground/90 leading-relaxed">{anime.summary}</p>
            </CardContent>
          </Card>

          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-6">
            <InfoItem icon={Star} label="Đánh Giá" value={<Rating rating={anime.rating} />} />
            <InfoItem icon={Tv} label="Tình Trạng" value={anime.status} />
            <InfoItem icon={List} label="Số Tập" value={anime.episodeCount} />
            <InfoItem icon={Calendar} label="Ra mắt" value={anime.releaseYear} />
            <InfoItem icon={Clapperboard} label="Studio" value={anime.studio} />
            <InfoItem icon={Clock} label="Thời Lượng" value={anime.duration} />
          </dl>
        </div>
      </div>
    </Card>
  );
}
