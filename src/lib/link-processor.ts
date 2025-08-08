const TRUSTED_DOMAINS = [
  'youtube.com', 'www.youtube.com', 'youtu.be',
  'facebook.com', 'www.facebook.com', 'fb.com',
  'twitter.com', 'www.twitter.com', 'x.com',
  'instagram.com', 'www.instagram.com',
  'tiktok.com', 'www.tiktok.com',
  'myanimelist.net', 'www.myanimelist.net',
  'anilist.co', 'www.anilist.co',
  'crunchyroll.com', 'www.crunchyroll.com',
  'mangadex.org', 'www.mangadex.org',
  'imgur.com', 'www.imgur.com', 'i.imgur.com',
  'gyazo.com', 'www.gyazo.com',
  'tenor.com', 'www.tenor.com',
  'giphy.com', 'www.giphy.com',
  'github.com', 'www.github.com',
  'gitlab.com', 'www.gitlab.com',
  'stackoverflow.com', 'www.stackoverflow.com',
  'wikipedia.org', 'en.wikipedia.org', 'vi.wikipedia.org',
  'google.com', 'www.google.com',
  'reddit.com', 'www.reddit.com',
];

const BLOCKED_KEYWORDS = [
  'casino', 'poker', 'slot', 'bet365', 'gambling', 'lottery',
  'porn', 'xxx', 'adult', 'sex', 'nude', 'nsfw',
  'earn-money', 'get-rich', 'free-money', 'bitcoin-profit',
  'forex', 'trading-bot', 'crypto-bot',
  'bit.ly', 'tinyurl', 'short.link', 'goo.gl', 'ow.ly',
  'adf.ly', 'linkvertise', 'adfly',
  'click-here', 'buy-now', 'shop-now', 'discount',
  'promo', 'offer', 'deal', 'sale'
];

const SUSPICIOUS_TLDS = [
  '.tk', '.ml', '.ga', '.cf', '.click', '.download',
  '.review', '.top', '.win', '.bid', '.trade'
];

export interface ProcessedLink {
  url: string;
  displayText: string;
  isTrusted: boolean;
  isBlocked: boolean;
  reason?: string;
}

export interface LinkPart {
  type: 'text' | 'link';
  content: string;
  link?: ProcessedLink;
}

export class LinkProcessor {
  static isTrustedDomain(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      return TRUSTED_DOMAINS.some(domain => 
        hostname === domain || hostname.endsWith('.' + domain)
      );
    } catch {
      return false;
    }
  }
  
  static isBlockedUrl(url: string): { blocked: boolean; reason?: string } {
    const lowerUrl = url.toLowerCase();
    
    for (const keyword of BLOCKED_KEYWORDS) {
      if (lowerUrl.includes(keyword)) {
        return { blocked: true, reason: `Contains blocked keyword: ${keyword}` };
      }
    }
    
    for (const tld of SUSPICIOUS_TLDS) {
      if (lowerUrl.includes(tld)) {
        return { blocked: true, reason: `Suspicious domain extension` };
      }
    }
    
    if (lowerUrl.match(/^https?:\/\/[^\/]+\/[a-z0-9]{3,8}$/i)) {
      const domain = new URL(url).hostname;
      if (!this.isTrustedDomain(url) && domain.split('.').length <= 2) {
        return { blocked: true, reason: 'Possible URL shortener' };
      }
    }
    
    try {
      const hostname = new URL(url).hostname;
      if (hostname.split('.').length > 4) {
        return { blocked: true, reason: 'Suspicious URL structure' };
      }
    } catch {
      return { blocked: true, reason: 'Invalid URL' };
    }
    
    return { blocked: false };
  }
  
  static processUrl(url: string): ProcessedLink {
    let fullUrl = url;
    if (!url.match(/^https?:\/\//i)) {
      fullUrl = 'https://' + url;
    }
    
    const blockCheck = this.isBlockedUrl(fullUrl);
    if (blockCheck.blocked) {
      return {
        url: fullUrl,
        displayText: '[Link bị chặn]',
        isTrusted: false,
        isBlocked: true,
        reason: blockCheck.reason
      };
    }
    
    const isTrusted = this.isTrustedDomain(fullUrl);
    
    let displayText = url;
    try {
      const urlObj = new URL(fullUrl);
      displayText = urlObj.hostname + (urlObj.pathname !== '/' ? urlObj.pathname : '');
      if (displayText.length > 50) {
        displayText = displayText.substring(0, 47) + '...';
      }
    } catch {
      displayText = url.length > 50 ? url.substring(0, 47) + '...' : url;
    }
    
    return {
      url: fullUrl,
      displayText,
      isTrusted,
      isBlocked: false
    };
  }
  
  static parseTextWithLinks(text: string): LinkPart[] {
    const urlRegex = /(https?:\/\/[^\s]+|(?:www\.)[^\s]+|[a-zA-Z0-9][a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;
    const parts: LinkPart[] = [];
    let lastIndex = 0;
    let match;
    
    while ((match = urlRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, match.index)
        });
      }
      
      const processedLink = this.processUrl(match[0]);
      parts.push({
        type: 'link',
        content: processedLink.displayText,
        link: processedLink
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex)
      });
    }
    
    if (parts.length === 0) {
      parts.push({
        type: 'text',
        content: text
      });
    }
    
    return parts;
  }
  
  static validateCommentUrls(content: string): { valid: boolean; reason?: string } {
    const urlRegex = /(https?:\/\/[^\s]+|(?:www\.)[^\s]+|[a-zA-Z0-9][a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;
    const urls = content.match(urlRegex) || [];
    
    if (urls.length > 3) {
      return { valid: false, reason: 'Quá nhiều liên kết (tối đa 3)' };
    }
    
    for (const url of urls) {
      const blockCheck = this.isBlockedUrl(url);
      if (blockCheck.blocked) {
        return { valid: false, reason: blockCheck.reason || 'Liên kết bị chặn' };
      }
    }
    
    return { valid: true };
  }
}
export default LinkProcessor;
