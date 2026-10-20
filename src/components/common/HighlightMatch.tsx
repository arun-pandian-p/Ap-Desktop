import React from 'react';

interface HighlightMatchProps {
  text: string;
  query: string;
  className?: string;
  highlightClassName?: string;
}

export const HighlightMatch: React.FC<HighlightMatchProps> = ({
  text,
  query,
  className = '',
  highlightClassName = 'bg-red-100 dark:bg-red-900/60 text-[#E11D26] dark:text-red-300 font-bold px-0.5 rounded-xs',
}) => {
  if (!text) return null;
  const trimmed = (query || '').trim();
  if (!trimmed) {
    return <span className={className}>{text}</span>;
  }

  // Escape special regex characters safely
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tokens = escaped.split(/\s+/).filter(Boolean);
  const pattern = tokens.length > 0 ? tokens.join('|') : escaped;

  try {
    const regex = new RegExp(`(${pattern})`, 'gi');
    const parts = text.split(regex);

    return (
      <span className={className}>
        {parts.map((part, index) => {
          const isMatch = tokens.some(t => t.toLowerCase() === part.toLowerCase());
          return isMatch ? (
            <mark key={index} className={highlightClassName}>
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          );
        })}
      </span>
    );
  } catch {
    return <span className={className}>{text}</span>;
  }
};
