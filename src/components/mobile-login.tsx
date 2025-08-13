"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  LogIn, 
  UserPlus,
  AlertCircle,
  Loader2,
  X,
  Heart
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { checkPasswordStrength, getStrengthColor, getStrengthLabel } from '@/lib/password-strength';

interface MobileLoginProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileLogin({ isOpen, onClose }: MobileLoginProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  
  const { login, register } = useAuth();

  // Form fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  // Validation states
  const [passwordStrength, setPasswordStrength] = useState(checkPasswordStrength(''));
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [usernameAvailable, setUsernameAvailable] = useState(true);

  // Handle close with animation
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200); // Match animation duration
  };
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setEmail('');
      setDisplayName('');
      setError('');
      setMode('login');
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      
      // Prevent scrolling
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        // Restore scrolling and position
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Check password strength
  useEffect(() => {
    if (mode === 'register') {
      setPasswordStrength(checkPasswordStrength(password));
    }
  }, [password, mode]);

  // Check password match
  useEffect(() => {
    if (mode === 'register' && confirmPassword) {
      setPasswordMatch(password === confirmPassword);
    }
  }, [password, confirmPassword, mode]);

  // Check username availability
  useEffect(() => {
    if (mode === 'register' && username && username.length >= 3) {
      setCheckingUsername(true);
      const timer = setTimeout(async () => {
        try {
          const response = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data.success) {
            setUsernameAvailable(data.available);
          } else {
            // If API returns success: false, assume username is available to avoid blocking user
            setUsernameAvailable(true);
          }
        } catch (error) {
          console.error('Username check failed:', error);
          // On error, assume username is available to avoid blocking user
          setUsernameAvailable(true);
        } finally {
          setCheckingUsername(false);
        }
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      // Reset states when username is too short or not in register mode
      setCheckingUsername(false);
      setUsernameAvailable(true);
    }
  }, [username, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Basic validation
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }
    
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const result = await login(username.trim(), password);
        if (result.success) {
          handleClose();
        } else {
          setError(result.error || 'Tên đăng nhập hoặc mật khẩu không đúng');
        }
      } else {
        // Additional validation for registration
        if (username.trim().length < 3) {
          setError('Tên đăng nhập phải có ít nhất 3 ký tự');
          setIsSubmitting(false);
          return;
        }
        
        if (password.length < 6) {
          setError('Mật khẩu phải có ít nhất 6 ký tự');
          setIsSubmitting(false);
          return;
        }
        
        // Check password match before proceeding
        if (!passwordMatch) {
          setError('Mật khẩu xác nhận không khớp');
          setIsSubmitting(false);
          return;
        }
        
        // Check username availability
        if (!usernameAvailable) {
          setError('Tên đăng nhập đã được sử dụng');
          setIsSubmitting(false);
          return;
        }
        
        const result = await register(username.trim(), password, password, email.trim() || undefined, displayName.trim() || undefined);
        if (result.success) {
          handleClose();
        } else {
          setError(result.error || 'Đăng ký thất bại. Vui lòng thử lại');
        }
      }
    } catch (err) {
      setError('Có lỗi xảy ra. Vui lòng thử lại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    // Reset username checking state when switching modes
    setCheckingUsername(false);
    setUsernameAvailable(true);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div 
          className="fixed inset-0 z-50 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={isClosing ? { opacity: 0 } : { opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={isClosing ? { opacity: 0, scale: 0.95, y: 20 } : { opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 30,
                  duration: 0.2 
                }}
                className="relative w-full max-w-md bg-white/70 dark:bg-gray-900/70 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 dark:border-gray-700/30 overflow-hidden"
              >
                {/* Background image with blur - inside form container */}
                <div 
                  className="absolute inset-0 -z-10"
                  style={{
                    backgroundImage: 'url(/images/Elaina.jpg)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'blur(12px)',
                    transform: 'scale(1.1)'
                  }}
                />
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center gap-3">
                <Heart className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                  {mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  Tên đăng nhập
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-11"
                    placeholder="Nhập tên đăng nhập"
                    required
                    autoComplete="username"
                  />
                  {mode === 'register' && username && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {checkingUsername ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : usernameAvailable ? (
                        <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
                          <div className="h-2 w-2 bg-white rounded-full" />
                        </div>
                      ) : (
                        <div className="h-4 w-4 rounded-full bg-red-500 flex items-center justify-center">
                          <X className="h-2 w-2 text-white" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {mode === 'register' && username && !usernameAvailable && (
                  <p className="text-sm text-red-500">Tên đăng nhập đã được sử dụng</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Mật khẩu
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11"
                    placeholder="Nhập mật khẩu"
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {mode === 'register' && password && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Độ mạnh mật khẩu</span>
                      <span className={getStrengthColor(passwordStrength.level)}>
                        {getStrengthLabel(passwordStrength.level)}
                      </span>
                    </div>
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${getStrengthColor(passwordStrength.level)} bg-current`}
                        style={{ width: `${passwordStrength.percentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Register additional fields */}
              {mode === 'register' && (
                <>
                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">
                      Xác nhận mật khẩu
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 pr-10 h-11"
                        placeholder="Nhập lại mật khẩu"
                        required
                        autoComplete="new-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {confirmPassword && !passwordMatch && (
                      <p className="text-sm text-red-500">Mật khẩu không khớp</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email (tùy chọn)
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-11"
                        placeholder="Nhập email (không bắt buộc)"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {/* Display Name */}
                  <div className="space-y-2">
                    <Label htmlFor="displayName" className="text-sm font-medium">
                      Tên hiển thị (tùy chọn)
                    </Label>
                    <Input
                      id="displayName"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="h-11"
                      placeholder="Tên hiển thị"
                      autoComplete="name"
                    />
                  </div>
                </>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
                disabled={
                  isSubmitting || 
                  !username.trim() || 
                  !password.trim() ||
                  (mode === 'register' && (
                    !usernameAvailable || 
                    !passwordMatch ||
                    checkingUsername ||
                    username.trim().length < 3 ||
                    password.length < 6
                  ))
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang xử lý...
                  </>
                ) : mode === 'login' ? (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Đăng nhập
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Đăng ký
                  </>
                )}
              </Button>

              {/* Switch Mode */}
              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={switchMode}
                  className="text-sm h-auto p-0"
                >
                  {mode === 'login' ? (
                    "Chưa có tài khoản? Đăng ký ngay"
                  ) : (
                    "Đã có tài khoản? Đăng nhập"
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
