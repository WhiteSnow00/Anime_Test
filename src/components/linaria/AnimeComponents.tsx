'use client';

import { styled } from '@linaria/react';
import { css } from '@linaria/core';
import { ReactNode } from 'react';

// ============= MODAL COMPONENT =============
export const ModalOverlay = styled.div<{ open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: ${props => props.open ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: ${props => props.open ? 'fadeIn 0.2s ease' : 'none'};
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

export const ModalContent = styled.div`
  position: relative;
  background: white;
  border-radius: var(--radius);
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

export const ModalHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .modal-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--foreground);
  }
`;

export const ModalBody = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  max-height: calc(90vh - 140px);
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: var(--accent);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--primary);
    border-radius: 4px;
  }
`;

export const ModalFooter = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
`;

export const CloseButton = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: var(--accent);
  color: var(--foreground);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--destructive);
    color: white;
    transform: rotate(90deg);
  }
`;

// ============= ANIME GRID COMPONENT =============
export const AnimeGrid = styled.div<{ columns?: number }>`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
  width: 100%;
  
  @media (min-width: 640px) {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
  
  @media (min-width: 768px) {
    grid-template-columns: repeat(${props => props.columns || 4}, 1fr);
  }
  
  @media (min-width: 1024px) {
    grid-template-columns: repeat(${props => props.columns || 5}, 1fr);
  }
  
  @media (min-width: 1280px) {
    grid-template-columns: repeat(${props => props.columns || 6}, 1fr);
  }
`;

export const GridSkeleton = styled.div`
  aspect-ratio: 3 / 4;
  border-radius: var(--radius);
  background: linear-gradient(
    90deg,
    var(--accent) 0%,
    var(--muted) 50%,
    var(--accent) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease infinite;
  
  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`;

// ============= BUTTON VARIANTS =============
export const Button = styled.button<{ 
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 500;
  border-radius: var(--radius);
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
  width: ${props => props.fullWidth ? '100%' : 'auto'};
  
  /* Size variants */
  padding: ${props => {
    switch(props.size) {
      case 'sm': return '0.5rem 1rem';
      case 'lg': return '0.75rem 2rem';
      default: return '0.625rem 1.5rem';
    }
  }};
  
  font-size: ${props => {
    switch(props.size) {
      case 'sm': return '0.75rem';
      case 'lg': return '1rem';
      default: return '0.875rem';
    }
  }};
  
  /* Color variants */
  background: ${props => {
    switch(props.variant) {
      case 'secondary': return 'var(--secondary)';
      case 'ghost': return 'transparent';
      case 'destructive': return 'var(--destructive)';
      default: return 'var(--primary)';
    }
  }};
  
  color: ${props => {
    switch(props.variant) {
      case 'ghost': return 'var(--foreground)';
      case 'destructive': return 'var(--destructive-foreground)';
      default: return 'var(--primary-foreground)';
    }
  }};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    
    ${props => props.variant === 'ghost' && css`
      background: var(--accent);
    `}
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

// ============= SECTION HEADER =============
export const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  
  .section-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--foreground);
    position: relative;
    padding-left: 1rem;
    
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 24px;
      background: linear-gradient(180deg, #ff6b9d 0%, #c66cfd 100%);
      border-radius: 2px;
    }
  }
  
  .section-actions {
    display: flex;
    gap: 0.5rem;
  }
`;

// ============= TABS COMPONENT =============
export const TabsContainer = styled.div`
  width: 100%;
`;

export const TabsList = styled.div`
  display: flex;
  gap: 0.25rem;
  border-bottom: 2px solid var(--border);
  margin-bottom: 1.5rem;
`;

export const TabsTrigger = styled.button<{ active?: boolean }>`
  padding: 0.75rem 1.5rem;
  background: transparent;
  border: none;
  color: ${props => props.active ? 'var(--primary)' : 'var(--muted-foreground)'};
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  position: relative;
  transition: color 0.2s ease;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--primary);
    transform: scaleX(${props => props.active ? 1 : 0});
    transition: transform 0.2s ease;
  }
  
  &:hover {
    color: var(--primary);
  }
`;

export const TabsContent = styled.div<{ active?: boolean }>`
  display: ${props => props.active ? 'block' : 'none'};
  animation: ${props => props.active ? 'fadeIn 0.3s ease' : 'none'};
`;

// ============= STATS CARD =============
export const StatsCard = styled.div`
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.5rem;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  }
  
  .stat-label {
    font-size: 0.75rem;
    color: var(--muted-foreground);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }
  
  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    background: linear-gradient(135deg, #ff6b9d 0%, #c66cfd 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .stat-change {
    font-size: 0.875rem;
    margin-top: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    
    &.positive {
      color: #10b981;
    }
    
    &.negative {
      color: #ef4444;
    }
  }
`;

// ============= INTEGRATION HELPERS =============

// Utility function to combine Tailwind classes with Linaria
export const cx = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ');
};

// Example integration component showing Tailwind + Linaria
export const IntegratedCard = styled.div.attrs<{ className?: string }>(props => ({
  className: cx('p-4 rounded-lg shadow-md', props.className)
}))`
  background: var(--card);
  border: 1px solid var(--border);
  transition: all 0.2s ease;
  
  /* Linaria styles work alongside Tailwind utilities */
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  }
`;

// Theme-aware component
export const ThemedButton = styled.button`
  padding: 0.625rem 1.5rem;
  border-radius: var(--radius);
  font-weight: 500;
  transition: all 0.2s ease;
  
  /* Light theme */
  background: hsl(351 100% 86%);
  color: hsl(349 71% 23%);
  border: 1px solid hsl(351 100% 88%);
  
  /* Dark theme support */
  .dark & {
    background: hsl(351 80% 70%);
    color: hsl(351 90% 15%);
    border: 1px solid hsl(240 10% 25%);
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 107, 157, 0.3);
  }
`;

// Responsive utilities
export const ResponsiveContainer = styled.div`
  padding: 1rem;
  
  @media (min-width: 640px) {
    padding: 1.5rem;
  }
  
  @media (min-width: 768px) {
    padding: 2rem;
  }
  
  @media (min-width: 1024px) {
    padding: 2.5rem;
    max-width: 1280px;
    margin: 0 auto;
  }
`;

// Example Modal Usage
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  return (
    <ModalOverlay open={open} onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <h2 className="modal-title">{title}</h2>
          <CloseButton onClick={onClose}>✕</CloseButton>
        </ModalHeader>
        <ModalBody>{children}</ModalBody>
      </ModalContent>
    </ModalOverlay>
  );
}