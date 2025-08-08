"use client";

import React from 'react';
import { LinkProcessor } from '@/lib/link-processor';
import { ExternalLink, AlertTriangle } from 'lucide-react';

interface CommentContentProps {
  content: string;
  className?: string;
}

export function CommentContent({ content, className = "" }: CommentContentProps) {
  const processedContent = React.useMemo(() => {
    const linkParts = LinkProcessor.parseTextWithLinks(content);
    
    if (linkParts.length === 1 && linkParts[0].type === 'text') {
      return content;
    }
    
    return linkParts.map((part, index) => {
      if (part.type === 'text') {
        return <span key={`text-${index}`}>{part.content}</span>;
      }
      
      const link = part.link;
      if (!link) return null;
      
      if (link.isBlocked) {
        return (
          <span 
            key={`blocked-${index}`} 
            className="text-muted-foreground/70 italic"
            title={link.reason}
          >
            {link.displayText}
          </span>
        );
      }
      
      return (
        <a
          key={`link-${index}`}
          href={link.url}
          target="_blank"
          rel={link.isTrusted ? "noopener noreferrer" : "noopener noreferrer nofollow"}
          className={`
            inline-flex items-center gap-0.5 underline decoration-1 underline-offset-2
            hover:no-underline transition-all duration-200
            ${link.isTrusted 
              ? 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 decoration-blue-600/50 dark:decoration-blue-400/50' 
              : 'text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400 decoration-amber-600/50 dark:decoration-amber-500/50'}
          `}
          title={link.isTrusted 
            ? `Mở liên kết: ${link.url}` 
            : `⚠️ Liên kết bên ngoài: ${link.url}`}
          onClick={(e) => {
            if (!link.isTrusted) {
              e.preventDefault();
              const confirmed = window.confirm(
                `⚠️ Cảnh báo: Liên kết bên ngoài\n\n` +
                `URL: ${link.url}\n\n` +
                `Đây không phải là trang web được xác thực. ` +
                `Bạn có chắc chắn muốn tiếp tục?`
              );
              if (confirmed) {
                window.open(link.url, '_blank', 'noopener,noreferrer');
              }
            }
          }}
        >
          <span className="break-all">
            {link.displayText}
          </span>
          {link.isTrusted ? (
            <ExternalLink className="w-3 h-3 flex-shrink-0 ml-0.5" />
          ) : (
            <AlertTriangle className="w-3 h-3 flex-shrink-0 ml-0.5" />
          )}
        </a>
      );
    });
  }, [content]);
  
  return (
    <div className={`comment-content-with-links ${className}`}>
      {processedContent}
    </div>
  );
}
export default CommentContent;
