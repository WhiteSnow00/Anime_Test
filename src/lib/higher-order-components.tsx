import React, { memo, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';

// Higher-Order Component for performance optimization
export function withPerformanceOptimization<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  options: {
    memoization?: boolean;
    displayName?: string;
    shouldUpdate?: (prevProps: T, nextProps: T) => boolean;
  } = {}
) {
  const {
    memoization = true,
    displayName,
    shouldUpdate,
  } = options;

  const OptimizedComponent = (props: T) => {
    const memoizedProps = useMemo(() => props, [
      shouldUpdate ? shouldUpdate : Object.values(props)
    ]);

    return <Component {...memoizedProps} />;
  };

  const WrappedComponent = memoization ? memo(OptimizedComponent) : OptimizedComponent;
  
  if (displayName) {
    (WrappedComponent as any).displayName = displayName;
  } else {
    (WrappedComponent as any).displayName = `withPerformanceOptimization(${Component.displayName || Component.name})`;
  }
  
  return WrappedComponent;
}

// Higher-Order Component for loading states
export function withLoadingState<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  LoadingComponent?: React.ComponentType
) {
  return function WithLoadingStateComponent(props: T & { isLoading?: boolean }) {
    const { isLoading, ...restProps } = props;

    if (isLoading) {
      return LoadingComponent ? <LoadingComponent /> : <div>Loading...</div>;
    }

    return <Component {...(restProps as T)} />;
  };
}

// Higher-Order Component for error boundaries
export function withErrorBoundary<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  ErrorComponent?: React.ComponentType<{ error: Error; resetError: () => void }>
) {
  return class WithErrorBoundaryComponent extends React.Component<
    T,
    { hasError: boolean; error: Error | null }
  > {
    constructor(props: T) {
      super(props);
      this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    resetError = () => {
      this.setState({ hasError: false, error: null });
    };

    render() {
      if (this.state.hasError) {
        if (ErrorComponent) {
          return <ErrorComponent error={this.state.error!} resetError={this.resetError} />;
        }
        return <div>Something went wrong.</div>;
      }

      return <Component {...this.props} />;
    }
  };
}

// Higher-Order Component for conditional rendering
export function withConditionalRender<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  condition: (props: T) => boolean,
  FallbackComponent?: React.ComponentType<T>
) {
  return function WithConditionalRenderComponent(props: T) {
    if (!condition(props)) {
      return FallbackComponent ? <FallbackComponent {...props} /> : null;
    }

    return <Component {...props} />;
  };
}

// Higher-Order Component for responsive behavior
export function withResponsive<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  options: {
    mobile?: Partial<T>;
    tablet?: Partial<T>;
    desktop?: Partial<T>;
  } = {}
) {
  return function WithResponsiveComponent(props: T) {
    const getResponsiveProps = useCallback(() => {
      if (typeof window === 'undefined') return props;

      const width = window.innerWidth;
      let responsiveProps = { ...props };

      if (width < 768 && options.mobile) {
        responsiveProps = { ...responsiveProps, ...options.mobile };
      } else if (width >= 768 && width < 1024 && options.tablet) {
        responsiveProps = { ...responsiveProps, ...options.tablet };
      } else if (width >= 1024 && options.desktop) {
        responsiveProps = { ...responsiveProps, ...options.desktop };
      }

      return responsiveProps;
    }, [props]);

    const responsiveProps = useMemo(getResponsiveProps, [getResponsiveProps]);

    return <Component {...responsiveProps} />;
  };
}

// Higher-Order Component for theme support
export function withTheme<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  themeClasses: {
    light?: string;
    dark?: string;
    auto?: string;
  } = {}
) {
  return function WithThemeComponent(props: T & { className?: string }) {
    const { className, ...restProps } = props;

    const getThemeClass = useCallback(() => {
      if (typeof window === 'undefined') return themeClasses.auto || '';

      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = isDark ? 'dark' : 'light';
      
      return themeClasses[theme] || themeClasses.auto || '';
    }, []);

    const themeClass = useMemo(getThemeClass, [getThemeClass]);
    const combinedClassName = cn(themeClass, className);

    return <Component {...(restProps as T)} className={combinedClassName} />;
  };
}

// Higher-Order Component for analytics/tracking
export function withAnalytics<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  options: {
    trackMount?: boolean;
    trackUnmount?: boolean;
    trackProps?: (keyof T)[];
    eventName?: string;
  } = {}
) {
  return function WithAnalyticsComponent(props: T) {
    const {
      trackMount = false,
      trackUnmount = false,
      trackProps = [],
      eventName = 'component_interaction',
    } = options;

    const track = useCallback((event: string, data?: any) => {
      // Replace with your analytics implementation
      // Analytics tracking would go here in production
    }, []);

    React.useEffect(() => {
      if (trackMount) {
        const trackedData = trackProps.reduce((acc, key) => {
          acc[key as string] = props[key];
          return acc;
        }, {} as any);

        track(`${eventName}_mount`, trackedData);
      }

      return () => {
        if (trackUnmount) {
          track(`${eventName}_unmount`);
        }
      };
    }, [track, trackMount, trackUnmount, eventName, props]);

    return <Component {...props} />;
  };
}

// Higher-Order Component for intersection observer
export function withIntersectionObserver<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  options: {
    threshold?: number;
    rootMargin?: string;
    onIntersect?: (isIntersecting: boolean) => void;
  } = {}
) {
  return function WithIntersectionObserverComponent(props: T) {
    const ref = React.useRef<HTMLDivElement>(null);
    const [isIntersecting, setIsIntersecting] = React.useState(false);

    React.useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          const isIntersecting = entry.isIntersecting;
          setIsIntersecting(isIntersecting);
          options.onIntersect?.(isIntersecting);
        },
        {
          threshold: options.threshold || 0.1,
          rootMargin: options.rootMargin || '0px',
        }
      );

      if (ref.current) {
        observer.observe(ref.current);
      }

      return () => observer.disconnect();
    }, []);

    return (
      <div ref={ref}>
        <Component {...props} isIntersecting={isIntersecting} />
      </div>
    );
  };
}

// Compose multiple HOCs
export function compose<T>(...hocs: Array<(component: React.ComponentType<any>) => React.ComponentType<any>>) {
  return function (Component: React.ComponentType<T>) {
    return hocs.reduceRight((acc, hoc) => hoc(acc), Component);
  };
}

// Export all HOCs
export const HOCs = {
  withPerformanceOptimization,
  withLoadingState,
  withErrorBoundary,
  withConditionalRender,
  withResponsive,
  withTheme,
  withAnalytics,
  withIntersectionObserver,
  compose,
};
