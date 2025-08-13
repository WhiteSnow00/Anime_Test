"use client";

import { useState, useEffect, useRef } from 'react';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, User, Lock, Mail, AlertCircle, X, Check, UserCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { checkPasswordStrength, getStrengthColor, getStrengthBgColor, getStrengthLabel } from '@/lib/password-strength';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 300 : -300,
    opacity: 0
  })
};

const hasVietnameseCharacters = (text: string): boolean => {
  const vietnamesePattern = /[\u0100-\u017F\u0180-\u024F\u0300-\u036F\u1E00-\u1EFF]/;
  const normalizedText = text.normalize('NFD');
  return vietnamesePattern.test(text) || vietnamesePattern.test(normalizedText);
};

const isValidUsername = (text: string): boolean => {
  if (text.length < 3 || text.length > 20) {
    return false;
  }
  
  if (!/^[a-zA-Z0-9][a-zA-Z0-9@#$_-]*$/.test(text)) {
    return false;
  }
  
  return !hasVietnameseCharacters(text);
};

const isValidPassword = (text: string): boolean => {
  return text.length > 0 && !hasVietnameseCharacters(text);
};

const isValidDisplayName = (text: string): boolean => {
  return text.trim().length > 0 && text.trim().length <= 50 && !/[<>'"&\\\/]/.test(text);
};

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [[page, direction], setPage] = useState([0, 0]);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const { login, register } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [showDisplayName, setShowDisplayName] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(checkPasswordStrength(''));
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [showPasswordMismatch, setShowPasswordMismatch] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(true);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);
  
  const confirmPasswordRef = useRef<NodeJS.Timeout | null>(null);
  const usernameCheckRef = useRef<NodeJS.Timeout | null>(null);
  const explicitCloseRef = useRef<boolean>(false);
  
  const isMobileDevice = () => {
    if (typeof window === 'undefined') return true;
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasTouchCapability = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const smallScreen = window.innerWidth <= 1024;
    
    if (isIOS) return true;
    return isMobileUserAgent || (hasTouchCapability && smallScreen);
  };
  
  const [isMobile, setIsMobile] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMobile(isMobileDevice());
    }, 150);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        if (!rememberPassword) {
          setUsername('');
          setPassword('');
        }
        setConfirmPassword('');
        setEmail('');
        setDisplayName('');
        setShowDisplayName(false);
        setError('');
        setPasswordStrength(checkPasswordStrength(''));
        setMode('login');
        setShowPassword(false);
        setShowConfirmPassword(false);
        // Always reset remember password when modal closes
        setRememberPassword(false);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      if (mode === 'login') {
        const savedUsername = localStorage.getItem('savedUsername');
        const savedPassword = localStorage.getItem('savedPassword');
        const savedRemember = localStorage.getItem('rememberPassword') === 'true';
        
        // Auto-fill saved credentials if they exist, but don't auto-check remember
        if (savedRemember && savedUsername && savedPassword) {
          setUsername(savedUsername);
          setPassword(savedPassword);
          // Keep rememberPassword false until user manually checks it
          setRememberPassword(false);
        }
      }
    }
  }, [isOpen]); // Remove rememberPassword from dependency array
  
  useEffect(() => {
    setError('');
  }, [mode]);

  const checkUsernameAvailability = async (username: string) => {
    if (!username || mode !== 'register' || !isValidUsername(username)) {
      setCheckingUsername(false);
      return;
    }
    
    try {
      const response = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
      const data = await response.json();
      
      if (data.success) {
        setUsernameAvailable(data.available);
      }
    } catch (error) {
      console.error('Failed to check username availability:', error);
      setUsernameAvailable(true);
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    
    if (mode === 'register' && value) {
      if (usernameCheckRef.current) clearTimeout(usernameCheckRef.current);
      
      if (value.length >= 3) {
        setCheckingUsername(true);
        usernameCheckRef.current = setTimeout(() => {
          checkUsernameAvailability(value);
        }, 500);
      } else {
        setCheckingUsername(false);
        setUsernameAvailable(true);
      }
    } else {
      setCheckingUsername(false);
      setUsernameAvailable(true);
    }
  };

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
      setShowPasswordMismatch(value !== password);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username) {
      setError('Vui lòng nhập tên đăng nhập.');
      return;
    }
    
    if (username.length < 3 || username.length > 20) {
      setError('Tên đăng nhập phải từ 3-20 ký tự.');
      return;
    }
    
    if (!isValidUsername(username)) {
      setError('Tên đăng nhập chỉ được chứa chữ cái, số, @, #, $, gạch dưới (_) và gạch ngang (-). Phải bắt đầu bằng chữ hoặc số.');
      return;
    }
    
    if (!password) {
      setError('Vui lòng nhập mật khẩu.');
      return;
    }
    
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    
    if (!isValidPassword(password)) {
      setError('Mật khẩu chỉ được chứa chữ cái, số và ký tự đặc biệt không dấu.');
      return;
    }
    
    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('Mật khẩu xác nhận không khớp.');
        return;
      }
      
      if (!usernameAvailable) {
        setError('Tên đăng nhập đã tồn tại.');
        return;
      }
      
      if (showDisplayName && displayName && !isValidDisplayName(displayName)) {
        setError('Tên hiển thị không hợp lệ.');
        return;
      }
    }
    
    setError('');
    setIsSubmitting(true);

    try {
      let result;
      if (mode === 'login') {
        result = await login(username, password);
      } else {
        result = await register(
          username, 
          password, 
          confirmPassword, 
          email,
          showDisplayName ? displayName : undefined
        );
      }

      if (result.success) {
        if (mode === 'login' && rememberPassword) {
          localStorage.setItem('savedUsername', username);
          localStorage.setItem('savedPassword', password);
          localStorage.setItem('rememberPassword', 'true');
        } else if (mode === 'login' && !rememberPassword) {
          localStorage.removeItem('savedUsername');
          localStorage.removeItem('savedPassword');
          localStorage.removeItem('rememberPassword');
        }
        onClose();
      } else {
        setError(result.error || 'Đã xảy ra lỗi');
      }
    } catch (err) {
      setError('Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.');
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

  // Track if close was triggered by explicit action (not backdrop)
  // Handle modal close - prevent backdrop close on mobile
  const handleModalOpenChange = (open: boolean) => {
    if (!open) {
      if (!isMobile || explicitCloseRef.current) {
        // Allow close on desktop (any trigger) or mobile (explicit action only)
        explicitCloseRef.current = false; // Reset for next time
        onClose();
      }
    }
  };

  // Function to explicitly close modal (bypasses mobile backdrop restriction)
  const handleExplicitClose = () => {
    explicitCloseRef.current = true;
    onClose();
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={handleModalOpenChange}>
      <DialogPrimitive.Portal>
        {/* Transparent overlay - no dark background */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50" />
        
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 w-full max-w-[425px] translate-x-[-50%] translate-y-[-50%]",
            "bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border-white/20 dark:border-gray-700/30",
            "shadow-2xl rounded-lg p-6 overflow-visible",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
        >
          {/* Background image with blur - positioned behind form */}
          <div 
            className="absolute inset-0 -z-10 rounded-lg overflow-hidden"
            style={{
              backgroundImage: 'url(/images/Elaina.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(12px)'
            }}
          />
          {/* Custom close button */}
          <button
            onClick={handleExplicitClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <h2 className="text-xl font-bold text-center text-gray-800 dark:text-white">
              {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
            </h2>
          </div>

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
              <form onSubmit={handleSubmit} className="space-y-4 mt-4 relative z-0">
                <div className="space-y-2">
                  <Label htmlFor="username">Tên đăng nhập</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="Nhập tên đăng nhập..."
                      value={username}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      onBlur={() => {
                        if (mode === 'register' && username) {
                          checkUsernameAvailability(username);
                        }
                      }}
                      className="pl-10 pr-10"
                      required
                      disabled={isSubmitting}
                      autoComplete="username"
                      maxLength={20}
                      {...(!isMobile && { autoFocus: true })}
                    />
                    {mode === 'register' && username && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {checkingUsername ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : isValidUsername(username) ? (
                          usernameAvailable ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <div className="flex items-center gap-1">
                              <X className="h-4 w-4 text-destructive" />
                              <span className="text-xs text-destructive">Đã tồn tại</span>
                            </div>
                          )
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-destructive mr-1">
                              {username.length < 3 ? 'Quá ngắn' : 
                               hasVietnameseCharacters(username) ? 'Không dùng ký tự tiếng Việt' : 
                               !/^[a-zA-Z0-9]/.test(username) ? 'Phải bắt đầu bằng chữ hoặc số' :
                               !/^[a-zA-Z0-9][a-zA-Z0-9@#$_-]*$/.test(username) ? 'Chỉ dùng chữ, số, @, #, $, _ và -' : ''}
                            </span>
                            <X className="h-4 w-4 text-destructive" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {mode === 'register' && (
                    <p className="text-xs text-muted-foreground">
                      3-20 ký tự, chỉ dùng chữ cái, số, @, #, $, _ và -
                    </p>
                  )}
                </div>

                {mode === 'register' && (
                  <>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="showDisplayName"
                        checked={showDisplayName}
                        onCheckedChange={(checked) => setShowDisplayName(!!checked)}
                        disabled={isSubmitting}
                      />
                      <Label 
                        htmlFor="showDisplayName" 
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Sử dụng tên hiển thị khác khi bình luận
                      </Label>
                    </div>
                    
                    {showDisplayName && (
                      <div className="space-y-2">
                        <Label htmlFor="displayName">Tên hiển thị</Label>
                        <div className="relative">
                          <UserCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="displayName"
                            type="text"
                            placeholder="Tên hiển thị khi bình luận..."
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="pl-10"
                            disabled={isSubmitting}
                            maxLength={50}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Có thể sử dụng tiếng Việt có dấu</p>
                      </div>
                    )}
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">Mật khẩu</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Nhập mật khẩu..."
                      value={password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      className="pl-10 pr-16"
                      required
                      disabled={isSubmitting}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <span className="flex items-center gap-1">
                          <EyeOff className="h-4 w-4" />
                          <span>Ẩn</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          <span>Hiện</span>
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {mode === 'login' && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rememberPassword"
                      checked={rememberPassword}
                      onCheckedChange={(checked) => setRememberPassword(!!checked)}
                      disabled={isSubmitting}
                    />
                    <Label 
                      htmlFor="rememberPassword" 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Lưu mật khẩu
                    </Label>
                  </div>
                )}

                {mode === 'register' && (
                  <>
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
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Nhập lại mật khẩu..."
                          value={confirmPassword}
                          onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                          onBlur={() => {
                            if (confirmPassword) {
                              setPasswordMatch(confirmPassword === password);
                              setShowPasswordMismatch(confirmPassword !== password);
                            }
                          }}
                          className="pl-10 pr-24"
                          required
                          disabled={isSubmitting}
                          autoComplete="new-password"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                          {showPasswordMismatch && confirmPassword && (
                            <>
                              <X className="h-4 w-4 text-destructive" />
                              <span className="text-xs text-destructive">Không khớp</span>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
                            tabIndex={-1}
                          >
                            {showConfirmPassword ? (
                              <span className="flex items-center gap-1">
                                <EyeOff className="h-4 w-4" />
                                <span>Ẩn</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Eye className="h-4 w-4" />
                                <span>Hiện</span>
                              </span>
                            )}
                          </button>
                        </div>
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
                  disabled={isSubmitting || (mode === 'register' && (!passwordMatch || !usernameAvailable || (username.length > 0 && !isValidUsername(username))))}
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
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
