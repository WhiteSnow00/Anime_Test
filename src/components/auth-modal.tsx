"use client";

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, User, Lock, Mail, AlertCircle, X, Check } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { checkPasswordStrength, getStrengthColor, getStrengthBgColor, getStrengthLabel } from '@/lib/password-strength';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const slideVariants = {
  enter: (direction: number) => {
    return {
      x: direction > 0 ? 300 : -300,
      opacity: 0
    };
  },
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => {
    return {
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0
    };
  }
};

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [[page, direction], setPage] = useState([0, 0]);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const { login, register } = useAuth();

  // Form fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  
  // Password strength tracking
  const [passwordStrength, setPasswordStrength] = useState(checkPasswordStrength(''));
  
  // Reset form when modal is closed or mode changes
  useEffect(() => {
    if (!isOpen) {
      // Add a delay to reset mode after modal closes to prevent flash
      const timer = setTimeout(() => {
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setEmail('');
        setError('');
        setPasswordStrength(checkPasswordStrength(''));
        setMode('login');
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  
  useEffect(() => {
    setError('');
    // Don't reset form fields when switching between login/register to preserve username
  }, [mode]);

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setEmail('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      let result;
      if (mode === 'login') {
        result = await login(username, password);
      } else {
        result = await register(username, password, confirmPassword, email);
      }

      if (result.success) {
        resetForm();
        onClose();
      } else {
        setError(result.error || 'An error occurred');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    const newDirection = mode === 'login' ? 1 : -1;
    setPage([page + newDirection, newDirection]);
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setPassword('');
    setConfirmPassword('');
    setPasswordStrength(checkPasswordStrength(''));
  };
  
  const [passwordMatch, setPasswordMatch] = useState(true);
  const confirmPasswordRef = useRef<NodeJS.Timeout | null>(null);

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (mode === 'register') {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (confirmPasswordRef.current) clearTimeout(confirmPasswordRef.current);
    confirmPasswordRef.current = setTimeout(() => {
      setPasswordMatch(value === password);
    }, 500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </DialogTitle>
        </DialogHeader>

        <div className="relative overflow-hidden px-1">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={mode}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 500, damping: 35 },
                opacity: { duration: 0.15 }
              }}
              className="w-full"
            >
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="username">Tên đăng nhập</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                type="text"
                placeholder="Nhập tên đăng nhập..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10"
                required
                disabled={isSubmitting}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                className="pl-10"
                required
                disabled={isSubmitting}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
          </div>

          {mode === 'register' && (
            <>
              {/* Password Strength Indicator */}
              {password && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className={`font-medium ${getStrengthColor(passwordStrength.level)}`}>
                      Độ mạnh: {getStrengthLabel(passwordStrength.level)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(passwordStrength.percentage)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ease-out rounded-full ${getStrengthBgColor(passwordStrength.level)}`}
                      style={{ width: `${passwordStrength.percentage}%` }}
                    />
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <div className="flex items-start gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full mt-1 flex-shrink-0 ${getStrengthBgColor(passwordStrength.level)}`} />
                      <p className="text-xs text-muted-foreground leading-tight">
                        {passwordStrength.feedback.join(' • ')}
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Nhập lại mật khẩu..."
                    value={confirmPassword}
                    onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                className="pl-10 pr-10"
                required
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              {!passwordMatch && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                  <X className="text-destructive" />
                  <span className="text-xs text-muted-foreground">Mật khẩu không khớp</span>
                </div>
              )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (tùy chọn)</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={isSubmitting}
                    autoComplete="email"
                  />
                </div>
              </div>
            </>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || (mode === 'register' && !passwordMatch)}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              mode === 'login' ? 'Đăng nhập' : 'Đăng ký'
            )}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={switchMode}
              className="text-sm text-primary hover:underline"
              disabled={isSubmitting}
            >
              {mode === 'login' 
                ? 'Chưa có tài khoản? Đăng ký ngay' 
                : 'Đã có tài khoản? Đăng nhập'}
            </button>
          </div>
        </form>
            </motion.div>
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
