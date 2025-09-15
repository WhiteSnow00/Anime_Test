'use client';

import { styled } from '@linaria/react';
import { css } from '@linaria/core';
import Image from 'next/image';
import { ReactNode } from 'react';

// Styled wrapper for the anime card
export const AnimeCardWrapper = styled.div`
  position: relative;
  border-radius: 0.75rem;
  overflow: hidden;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
              box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--card);
  cursor: pointer;
  
  &:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15),
                0 0 60px rgba(255, 192, 203, 0.3);
  }

  @media (max-width: 640px) {
    &:hover {
      transform: translateY(-4px) scale(1.01);
    }
  }
`;

// Styled poster image container
export const PosterContainer = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  background: linear-gradient(135deg, #ffd6e7 0%, #e6c9ff 100%);
  
  .poster-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: filter 0.3s ease, transform 0.3s ease;
  }
  
  ${AnimeCardWrapper}:hover & .poster-image {
    filter: brightness(0.7) saturate(1.2);
    transform: scale(1.1);
  }
`;

// Episode badge
export const EpisodeBadge = styled.div`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  color: var(--primary-foreground);
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
`;

// Overlay with anime info
export const AnimeOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.9) 0%,
    rgba(0, 0, 0, 0.7) 50%,
    transparent 100%
  );
  padding: 2rem 1rem 1rem;
  transform: translateY(calc(100% - 60px));
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  ${AnimeCardWrapper}:hover & {
    transform: translateY(0);
  }

  .anime-title {
    color: white;
    font-size: 1rem;
    font-weight: 700;
    line-height: 1.3;
    margin-bottom: 0.5rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .anime-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .anime-genres {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    opacity: 0;
    transform: translateY(10px);
    transition: opacity 0.3s ease 0.1s, transform 0.3s ease 0.1s;
  }

  ${AnimeCardWrapper}:hover & .anime-genres {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Genre tag
export const GenreTag = styled.span`
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.3);
`;

// Play button overlay
export const PlayButton = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0);
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  
  ${AnimeCardWrapper}:hover & {
    transform: translate(-50%, -50%) scale(1);
  }

  &::after {
    content: '';
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 10px 0 10px 16px;
    border-color: transparent transparent transparent var(--primary);
    margin-left: 4px;
  }
`;

// Rating stars
export const RatingStars = styled.div`
  display: flex;
  align-items: center;
  gap: 0.125rem;
  
  .star {
    width: 12px;
    height: 12px;
    fill: #ffd700;
    opacity: 0.9;
  }
  
  .rating-text {
    margin-left: 0.25rem;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.9);
    font-weight: 600;
  }
`;

// Component interface
interface AnimeCardProps {
  title: string;
  posterUrl: string;
  episode?: number;
  totalEpisodes?: number;
  year?: string;
  rating?: number;
  genres?: string[];
  onClick?: () => void;
}

// Example usage component
export function AnimeCard({
  title,
  posterUrl,
  episode,
  totalEpisodes,
  year,
  rating,
  genres = [],
  onClick
}: AnimeCardProps) {
  return (
    <AnimeCardWrapper onClick={onClick}>
      <PosterContainer>
        <Image
          src={posterUrl}
          alt={title}
          fill
          className="poster-image"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        {episode && (
          <EpisodeBadge>
            EP {episode}{totalEpisodes && `/${totalEpisodes}`}
          </EpisodeBadge>
        )}
        <PlayButton />
      </PosterContainer>
      
      <AnimeOverlay>
        <h3 className="anime-title">{title}</h3>
        <div className="anime-meta">
          {year && <span>{year}</span>}
          {rating && (
            <RatingStars>
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className="star"
                  viewBox="0 0 24 24"
                  style={{ opacity: i < Math.floor(rating) ? 1 : 0.3 }}
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
              <span className="rating-text">{rating.toFixed(1)}</span>
            </RatingStars>
          )}
        </div>
        <div className="anime-genres">
          {genres.slice(0, 3).map((genre) => (
            <GenreTag key={genre}>{genre}</GenreTag>
          ))}
        </div>
      </AnimeOverlay>
    </AnimeCardWrapper>
  );
}