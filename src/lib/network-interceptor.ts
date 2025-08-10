export function initializeNetworkInterceptor() {
  if (typeof window === 'undefined') return;

  const originalFetch = window.fetch;
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  const urlMaskMap = new Map<string, string>();
  let maskCounter = 0;
  function getMaskedUrl(realUrl: string): string {
    if (realUrl.includes('tiktokcdn.com')) {
      let maskedUrl = Array.from(urlMaskMap.entries())
        .find(([_, real]) => real === realUrl)?.[0];
      
      if (!maskedUrl) {
        maskCounter++;
        maskedUrl = `/api/segment-${maskCounter}`;
        urlMaskMap.set(maskedUrl, realUrl);
      }
      
      return maskedUrl;
    }
    return realUrl;
  }

  window.fetch = function(...args) {
    let input = args[0];
    const init = args[1];
    
    if (typeof input === 'string') {
      const realUrl = input;
      const maskedUrl = getMaskedUrl(realUrl);
      
      if (maskedUrl !== realUrl) {
        return new Promise((resolve, reject) => {
          console.debug(`[Stream] Loading segment: ${maskedUrl}`);
          originalFetch.call(window, realUrl, init)
            .then(response => {
              const maskedResponse = new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers
              });
                Object.defineProperty(maskedResponse, 'url', {
                value: maskedUrl,
                writable: false
              });
              
              resolve(maskedResponse);
            })
            .catch(reject);
        });
      }
    }
    
    return originalFetch.apply(window, args as any);
  };

  XMLHttpRequest.prototype.open = function(
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null
  ) {
    const urlString = url.toString();
    const maskedUrl = getMaskedUrl(urlString);
    (this as any)._realUrl = urlString;
    (this as any)._maskedUrl = maskedUrl;
    return originalXHROpen.call(this, method, urlString, async!, username, password);
  };

  XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
    const xhr = this;
    const realUrl = (xhr as any)._realUrl;
    const maskedUrl = (xhr as any)._maskedUrl;
    
    if (maskedUrl && maskedUrl !== realUrl) {
      const originalGetter = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'responseURL');
      if (originalGetter) {
        Object.defineProperty(xhr, 'responseURL', {
          get: function() {
            return maskedUrl;
          },
          configurable: true
        });
      }
    }
    
    return originalXHRSend.call(this, body);
  };
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  
  console.log = function(...args: any[]) {
    const maskedArgs = args.map(arg => {
      if (typeof arg === 'string' && arg.includes('tiktokcdn.com')) {
        return arg.replace(/https?:\/\/[^\s]+tiktokcdn\.com[^\s]*/g, '[MASKED_CDN_URL]');
      }
      return arg;
    });
    return originalConsoleLog.apply(console, maskedArgs);
  };
  
  console.error = function(...args: any[]) {
    const maskedArgs = args.map(arg => {
      if (typeof arg === 'string' && arg.includes('tiktokcdn.com')) {
        return arg.replace(/https?:\/\/[^\s]+tiktokcdn\.com[^\s]*/g, '[MASKED_CDN_URL]');
      }
      return arg;
    });
    return originalConsoleError.apply(console, maskedArgs);
  };

  return () => {
    window.fetch = originalFetch;
    XMLHttpRequest.prototype.open = originalXHROpen;
    XMLHttpRequest.prototype.send = originalXHRSend;
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  };
}
