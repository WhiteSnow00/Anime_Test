/**
 * Resume Dialog Component
 * 
 * Shows "Continue watching?" prompt when user returns to an episode
 * with saved playback progress >= MIN_RESUME_THRESHOLD
 * 
 * Features:
 * - Accessible keyboard navigation (Enter/Escape)
 * - Mobile-friendly touch targets
 * - Auto-focus on primary action
 * - Backdrop click = "Start over"
 */

"use client";

import { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw } from 'lucide-react';

interface ResumeDialogProps {
  /** Whether dialog is open */
  open: boolean;
  
  /** Episode number for display */
  episodeNumber: number;
  
  /** Saved playback time in seconds */
  savedTime: number;
  
  /** Callback when user chooses to continue */
  onContinue: () => void;
  
  /** Callback when user chooses to start over */
  onStartOver: () => void;
  
  /** Callback when dialog closes (backdrop/escape) */
  onClose?: () => void;
}

/**
 * Format seconds to mm:ss or hh:mm:ss
 */
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function ResumeDialog({
  open,
  episodeNumber,
  savedTime,
  onContinue,
  onStartOver,
  onClose,
}: ResumeDialogProps) {
  const [isOpen, setIsOpen] = useState(open);

  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  const handleContinue = useCallback(() => {
    setIsOpen(false);
    onContinue();
  }, [onContinue]);

  const handleStartOver = useCallback(() => {
    setIsOpen(false);
    onStartOver();
  }, [onStartOver]);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Backdrop click or Escape pressed = treat as "Start over"
      onClose?.() || onStartOver();
    }
  }, [onClose, onStartOver]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleContinue();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleContinue]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="sm:max-w-[425px] gap-6"
        aria-describedby="resume-dialog-description"
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Tiếp tục xem?
          </DialogTitle>
          <DialogDescription id="resume-dialog-description" className="text-base pt-2">
            Lần trước bạn đã xem <span className="font-medium text-foreground">Tập {episodeNumber}</span> đến phút thứ{' '}
            <span className="font-medium text-foreground">{formatTime(savedTime)}</span>.
            <br />
            <span className="text-sm text-muted-foreground mt-2 block">
              Bạn có muốn tiếp tục xem từ vị trí này không?
            </span>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={handleStartOver}
            className="w-full sm:w-auto order-2 sm:order-1"
            aria-label="Xem tập từ đầu"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Xem từ đầu
          </Button>
          <Button
            onClick={handleContinue}
            className="w-full sm:w-auto order-1 sm:order-2"
            autoFocus
            aria-label={`Tiếp tục từ ${formatTime(savedTime)}`}
          >
            <Play className="mr-2 h-4 w-4" />
            Tiếp tục
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook for managing resume dialog state
 * 
 * @param episodeId - Current episode ID
 * @param savedProgress - Saved progress data
 * @param onResume - Callback to seek to saved time
 * @returns Dialog props and control functions
 */
export function useResumeDialog(
  episodeId: number,
  savedProgress: { time: number; declined: boolean } | null,
  onResume: (time: number) => void
) {
  const [showDialog, setShowDialog] = useState(false);
  const [hasPrompted, setHasPrompted] = useState(false);

  // Check if we should show the dialog
  useEffect(() => {
    if (!savedProgress || hasPrompted) return;

    const { time, declined } = savedProgress;
    
    // Don't prompt if user previously declined and time hasn't changed significantly
    if (declined) {
      setHasPrompted(true);
      return;
    }

    // Show dialog if time >= threshold
    const MIN_THRESHOLD = 30; // seconds
    if (time >= MIN_THRESHOLD) {
      setShowDialog(true);
      setHasPrompted(true);
    }
  }, [episodeId, savedProgress, hasPrompted]);

  const handleContinue = useCallback(() => {
    if (savedProgress) {
      onResume(savedProgress.time);
    }
    setShowDialog(false);
  }, [savedProgress, onResume]);

  const handleStartOver = useCallback(() => {
    setShowDialog(false);
    // Caller should set declined flag in storage
  }, []);

  return {
    showDialog,
    setShowDialog,
    handleContinue,
    handleStartOver,
    hasPrompted,
  };
}

