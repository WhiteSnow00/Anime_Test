'use client';

import { styled } from '@linaria/react';
import { css } from '@linaria/core';
import { useState, useRef, ReactNode } from 'react';

// Main video player container
export const VideoPlayerContainer = styled.div`
  position: relative;
  width: 100%;
  background: #000;
  border-radius: var(--radius);
  overflow: hidden;
  isolation: isolate;
  
  &:fullscreen {
    border-radius: 0;
  }
`;

// Video wrapper with aspect ratio
export const VideoWrapper = styled.div<{ aspectRatio?: string }>`
  position: relative;
  width: 100%;
  aspect-ratio: ${props => props.aspectRatio || '16 / 9'};
  background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%);
  
  video {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

// Overlay for controls
export const ControlsOverlay = styled.div<{ visible: boolean }>`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.7) 0%,
    transparent 20%,
    transparent 80%,
    rgba(0, 0, 0, 0.7) 100%
  );
  opacity: ${props => props.visible ? 1 : 0};
  transition: opacity 0.3s ease;
  pointer-events: ${props => props.visible ? 'auto' : 'none'};
`;

// Top bar with title and options
export const TopBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  color: white;
  
  .video-title {
    font-size: 1.125rem;
    font-weight: 600;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  }
  
  .options-row {
    display: flex;
    gap: 1rem;
  }
`;

// Bottom controls bar
export const ControlsBar = styled.div`
  padding: 1rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

// Progress bar
export const ProgressBar = styled.div`
  position: relative;
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  cursor: pointer;
  transition: height 0.2s ease;
  
  &:hover {
    height: 6px;
  }
`;

export const ProgressFilled = styled.div<{ progress: number }>`
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: ${props => props.progress}%;
  background: linear-gradient(90deg, #ff6b9d 0%, #c66cfd 100%);
  border-radius: 2px;
  transition: width 0.1s linear;
`;

export const ProgressThumb = styled.div<{ position: number }>`
  position: absolute;
  top: 50%;
  left: ${props => props.position}%;
  transform: translate(-50%, -50%) scale(0);
  width: 14px;
  height: 14px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease;
  
  ${ProgressBar}:hover & {
    transform: translate(-50%, -50%) scale(1);
  }
`;

// Control buttons row
export const ControlButtons = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
`;

export const ButtonGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

// Styled control button
export const ControlButton = styled.button<{ active?: boolean }>`
  background: ${props => props.active ? 'rgba(255, 255, 255, 0.2)' : 'transparent'};
  border: none;
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
  }
`;

// Play/Pause central button
export const CentralPlayButton = styled.button<{ visible: boolean }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: ${props => props.visible ? 1 : 0};
  transition: opacity 0.3s ease, transform 0.2s ease;
  pointer-events: ${props => props.visible ? 'auto' : 'none'};
  
  &:hover {
    transform: translate(-50%, -50%) scale(1.1);
    background: rgba(0, 0, 0, 0.8);
  }
  
  &::after {
    content: '';
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 15px 0 15px 25px;
    border-color: transparent transparent transparent white;
    margin-left: 5px;
  }
`;

// Volume control
export const VolumeControl = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  .volume-slider {
    width: 0;
    opacity: 0;
    transition: width 0.3s ease, opacity 0.3s ease;
  }
  
  &:hover .volume-slider {
    width: 80px;
    opacity: 1;
  }
`;

export const VolumeSlider = styled.input`
  width: 80px;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  outline: none;
  -webkit-appearance: none;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    background: white;
    border-radius: 50%;
    cursor: pointer;
  }
  
  &::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background: white;
    border-radius: 50%;
    cursor: pointer;
    border: none;
  }
`;

// Time display
export const TimeDisplay = styled.div`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.9);
  font-variant-numeric: tabular-nums;
  
  .current-time {
    color: white;
    font-weight: 500;
  }
  
  .separator {
    margin: 0 0.25rem;
    color: rgba(255, 255, 255, 0.5);
  }
  
  .total-time {
    color: rgba(255, 255, 255, 0.7);
  }
`;

// Settings menu
export const SettingsMenu = styled.div<{ open: boolean }>`
  position: absolute;
  bottom: 60px;
  right: 1.5rem;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 0.5rem;
  display: ${props => props.open ? 'block' : 'none'};
  min-width: 200px;
  color: white;
`;

export const SettingsItem = styled.button<{ active?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: ${props => props.active ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
  border: none;
  border-radius: 0.25rem;
  color: white;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  .label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .value {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.75rem;
  }
`;

// Subtitle overlay
export const SubtitleOverlay = styled.div`
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 80%;
  text-align: center;
  pointer-events: none;
  
  .subtitle-text {
    display: inline-block;
    padding: 0.5rem 1rem;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    font-size: 1.125rem;
    line-height: 1.5;
    border-radius: 0.25rem;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    font-weight: 500;
  }
`;

// Loading spinner
export const LoadingSpinner = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  
  &::after {
    content: '';
    display: block;
    width: 100%;
    height: 100%;
    border: 3px solid rgba(255, 255, 255, 0.2);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

// Episode navigation
export const EpisodeNav = styled.div`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 0 1rem;
  pointer-events: none;
  
  button {
    pointer-events: auto;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    padding: 0.75rem 1.25rem;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: background 0.2s ease, transform 0.2s ease;
    
    &:hover {
      background: rgba(0, 0, 0, 0.8);
      transform: scale(1.05);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
`;

// Interface for component props
interface VideoPlayerProps {
  src: string;
  title?: string;
  subtitles?: string;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

// Example usage component
export function VideoPlayer({
  src,
  title,
  subtitles,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(100);
  const [showSettings, setShowSettings] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <VideoPlayerContainer
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => !isPlaying && setShowControls(false)}
    >
      <VideoWrapper>
        <video ref={videoRef} src={src} />
        
        <ControlsOverlay visible={showControls}>
          <TopBar>
            <div className="video-title">{title || 'Anime Episode'}</div>
            <div className="options-row">
              <ControlButton>
                <svg viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" />
                </svg>
              </ControlButton>
            </div>
          </TopBar>
          
          <ControlsBar>
            <ProgressBar>
              <ProgressFilled progress={progress} />
              <ProgressThumb position={progress} />
            </ProgressBar>
            
            <ControlButtons>
              <ButtonGroup>
                <ControlButton onClick={() => setIsPlaying(!isPlaying)}>
                  {isPlaying ? '⏸' : '▶'}
                </ControlButton>
                <VolumeControl>
                  <ControlButton>🔊</ControlButton>
                  <VolumeSlider
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="volume-slider"
                  />
                </VolumeControl>
                <TimeDisplay>
                  <span className="current-time">0:00</span>
                  <span className="separator">/</span>
                  <span className="total-time">24:00</span>
                </TimeDisplay>
              </ButtonGroup>
              
              <ButtonGroup>
                <ControlButton onClick={() => setShowSettings(!showSettings)}>⚙</ControlButton>
                <ControlButton>⛶</ControlButton>
              </ButtonGroup>
            </ControlButtons>
          </ControlsBar>
        </ControlsOverlay>
        
        {!isPlaying && (
          <CentralPlayButton
            visible={!isPlaying}
            onClick={() => setIsPlaying(true)}
          />
        )}
        
        {subtitles && (
          <SubtitleOverlay>
            <div className="subtitle-text">{subtitles}</div>
          </SubtitleOverlay>
        )}
        
        <EpisodeNav>
          <button disabled={!hasPrevious} onClick={onPrevious}>
            ← Previous
          </button>
          <button disabled={!hasNext} onClick={onNext}>
            Next →
          </button>
        </EpisodeNav>
        
        <SettingsMenu open={showSettings}>
          <SettingsItem>
            <span className="label">Quality</span>
            <span className="value">1080p</span>
          </SettingsItem>
          <SettingsItem>
            <span className="label">Speed</span>
            <span className="value">1x</span>
          </SettingsItem>
          <SettingsItem>
            <span className="label">Subtitles</span>
            <span className="value">English</span>
          </SettingsItem>
        </SettingsMenu>
      </VideoWrapper>
    </VideoPlayerContainer>
  );
}