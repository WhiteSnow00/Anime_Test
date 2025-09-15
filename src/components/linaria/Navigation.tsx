'use client';

import { styled } from '@linaria/react';
import { css } from '@linaria/core';
import Link from 'next/link';
import { useState } from 'react';

// Main navigation container
export const NavContainer = styled.nav`
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  transition: background 0.3s ease;
  
  &.scrolled {
    background: rgba(255, 255, 255, 0.98);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  @media (max-width: 768px) {
    padding: 0.75rem 1rem;
  }
`;

// Navigation inner wrapper
export const NavWrapper = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
`;

// Logo section
export const LogoSection = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  .logo {
    font-size: 1.5rem;
    font-weight: 800;
    background: linear-gradient(135deg, #ff6b9d 0%, #c66cfd 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.02em;
    transition: transform 0.2s ease;
    
    &:hover {
      transform: scale(1.05);
    }
  }
  
  .logo-icon {
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #ff6b9d 0%, #c66cfd 100%);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    color: white;
  }
`;

// Navigation links
export const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

// Individual nav link
export const NavLink = styled.a<{ active?: boolean }>`
  position: relative;
  padding: 0.5rem 1rem;
  color: ${props => props.active ? 'var(--primary)' : 'var(--foreground)'};
  font-weight: 500;
  font-size: 0.875rem;
  text-decoration: none;
  transition: color 0.2s ease;
  
  &:hover {
    color: var(--primary);
  }
  
  &::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 50%;
    transform: translateX(-50%) scaleX(${props => props.active ? 1 : 0});
    width: calc(100% - 1rem);
    height: 2px;
    background: linear-gradient(90deg, #ff6b9d 0%, #c66cfd 100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  &:hover::after {
    transform: translateX(-50%) scaleX(1);
  }
`;

// Dropdown menu container
export const DropdownContainer = styled.div`
  position: relative;
`;

// Dropdown trigger button
export const DropdownTrigger = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  color: var(--foreground);
  font-weight: 500;
  font-size: 0.875rem;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.2s ease;
  
  &:hover {
    color: var(--primary);
  }
  
  .chevron {
    transition: transform 0.2s ease;
  }
  
  &[aria-expanded="true"] .chevron {
    transform: rotate(180deg);
  }
`;

// Dropdown menu
export const DropdownMenu = styled.div<{ open: boolean }>`
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  min-width: 220px;
  background: white;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  opacity: ${props => props.open ? 1 : 0};
  visibility: ${props => props.open ? 'visible' : 'hidden'};
  transform: translateY(${props => props.open ? '0' : '-10px'});
  transition: all 0.2s ease;
  z-index: 100;
  padding: 0.5rem;
`;

// Dropdown menu item
export const DropdownItem = styled.a`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  color: var(--foreground);
  text-decoration: none;
  font-size: 0.875rem;
  border-radius: calc(var(--radius) - 2px);
  transition: background 0.2s ease, color 0.2s ease;
  
  &:hover {
    background: var(--accent);
    color: var(--primary);
  }
  
  .badge {
    background: var(--primary);
    color: white;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.625rem;
    font-weight: 600;
  }
`;

// Search bar
export const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

export const SearchInput = styled.div<{ expanded: boolean }>`
  position: relative;
  width: ${props => props.expanded ? '280px' : '40px'};
  height: 40px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  input {
    width: 100%;
    height: 100%;
    padding: ${props => props.expanded ? '0 2.5rem 0 1rem' : '0'};
    background: var(--accent);
    border: 1px solid ${props => props.expanded ? 'var(--border)' : 'transparent'};
    border-radius: 9999px;
    font-size: 0.875rem;
    color: var(--foreground);
    opacity: ${props => props.expanded ? 1 : 0};
    transition: all 0.3s ease;
    
    &::placeholder {
      color: var(--muted-foreground);
    }
    
    &:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(255, 107, 157, 0.1);
    }
  }
  
  .search-icon {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    color: var(--muted-foreground);
    cursor: pointer;
    transition: color 0.2s ease;
    
    &:hover {
      color: var(--primary);
    }
  }
`;

// User menu
export const UserMenu = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

export const NotificationButton = styled.button`
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent);
  border: 1px solid var(--border);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--primary);
    color: white;
    transform: scale(1.05);
  }
  
  .badge {
    position: absolute;
    top: -2px;
    right: -2px;
    width: 12px;
    height: 12px;
    background: #ff4757;
    border: 2px solid white;
    border-radius: 50%;
  }
`;

export const UserAvatar = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--border);
  cursor: pointer;
  transition: all 0.2s ease;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  &:hover {
    border-color: var(--primary);
    transform: scale(1.05);
  }
`;

// Mobile menu button
export const MobileMenuButton = styled.button`
  display: none;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  
  @media (max-width: 768px) {
    display: flex;
  }
  
  .hamburger {
    width: 24px;
    height: 16px;
    position: relative;
    
    span {
      position: absolute;
      left: 0;
      width: 100%;
      height: 2px;
      background: var(--foreground);
      transition: all 0.3s ease;
      
      &:nth-child(1) {
        top: 0;
      }
      
      &:nth-child(2) {
        top: 50%;
        transform: translateY(-50%);
      }
      
      &:nth-child(3) {
        bottom: 0;
      }
    }
  }
  
  &[aria-expanded="true"] .hamburger {
    span:nth-child(1) {
      top: 50%;
      transform: translateY(-50%) rotate(45deg);
    }
    
    span:nth-child(2) {
      opacity: 0;
    }
    
    span:nth-child(3) {
      bottom: 50%;
      transform: translateY(50%) rotate(-45deg);
    }
  }
`;

// Mobile menu
export const MobileMenu = styled.div<{ open: boolean }>`
  display: none;
  position: fixed;
  top: 64px;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  padding: 1.5rem;
  transform: translateX(${props => props.open ? '0' : '100%'});
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 40;
  
  @media (max-width: 768px) {
    display: block;
  }
`;

// Example navigation component
interface NavigationProps {
  currentPath?: string;
}

export function Navigation({ currentPath = '/' }: NavigationProps) {
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [genreDropdownOpen, setGenreDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/trending', label: 'Trending' },
    { href: '/new-releases', label: 'New Releases' },
    { href: '/schedule', label: 'Schedule' },
  ];

  const genres = [
    { name: 'Action', count: 245 },
    { name: 'Romance', count: 189 },
    { name: 'Comedy', count: 156 },
    { name: 'Drama', count: 203 },
    { name: 'Fantasy', count: 178 },
    { name: 'Slice of Life', count: 92 },
  ];

  return (
    <NavContainer className={typeof window !== 'undefined' && window.scrollY > 0 ? 'scrolled' : ''}>
      <NavWrapper>
        <LogoSection>
          <div className="logo-icon">🌸</div>
          <Link href="/" className="logo">
            AnimeStream
          </Link>
        </LogoSection>

        <NavLinks>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} passHref>
              <NavLink active={currentPath === item.href}>
                {item.label}
              </NavLink>
            </Link>
          ))}
          
          <DropdownContainer>
            <DropdownTrigger
              aria-expanded={genreDropdownOpen}
              onClick={() => setGenreDropdownOpen(!genreDropdownOpen)}
            >
              Genres
              <span className="chevron">▼</span>
            </DropdownTrigger>
            
            <DropdownMenu open={genreDropdownOpen}>
              {genres.map((genre) => (
                <DropdownItem key={genre.name} href={`/genre/${genre.name.toLowerCase()}`}>
                  {genre.name}
                  <span className="badge">{genre.count}</span>
                </DropdownItem>
              ))}
            </DropdownMenu>
          </DropdownContainer>
        </NavLinks>

        <SearchBar>
          <SearchInput expanded={searchExpanded}>
            <input
              type="text"
              placeholder="Search anime..."
              onFocus={() => setSearchExpanded(true)}
              onBlur={() => setSearchExpanded(false)}
            />
            <span className="search-icon">🔍</span>
          </SearchInput>
          
          <UserMenu>
            <NotificationButton>
              🔔
              <span className="badge" />
            </NotificationButton>
            
            <UserAvatar>
              <img src="https://placehold.co/40x40" alt="User" />
            </UserAvatar>
          </UserMenu>
        </SearchBar>

        <MobileMenuButton
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <div className="hamburger">
            <span />
            <span />
            <span />
          </div>
        </MobileMenuButton>
      </NavWrapper>

      <MobileMenu open={mobileMenuOpen}>
        {/* Mobile menu content */}
      </MobileMenu>
    </NavContainer>
  );
}