import { useEffect, useMemo } from 'react';
import { convertLatexToMarkup } from 'mathlive/ssr';
import { MATH_STATIC_CSS } from '../../generated/math-static';
import { useAppTheme } from '../ThemeProvider';
export function MathContent({ children, className, color }: { children: string; className?: string; color?: string }) {
  const theme = useAppTheme();
  useEffect(() => {
    if (document.getElementById('memoraid-static-math')) return;
    const style = document.createElement('style'); style.id = 'memoraid-static-math'; style.textContent = MATH_STATIC_CSS;
    document.head.append(style);
  }, []);
  const parts = useMemo(() => children.split(/(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g), [children]);
  return <div className={className} style={{ color: color ?? (theme.colorScheme === 'dark' ? '#fff' : '#172136'), whiteSpace: 'pre-wrap', lineHeight: 1.7, overflowWrap: 'anywhere' }}>
    {parts.map((part, index) => {
      if (!part.startsWith('\\(') && !part.startsWith('\\[')) return <span key={index}>{part}</span>;
      try {
        const markup = convertLatexToMarkup(part.slice(2, -2).slice(0, 10000));
        return <span key={index} style={{ display: part.startsWith('\\[') ? 'block' : 'inline', overflowX: 'auto' }} dangerouslySetInnerHTML={{ __html: markup }} />;
      } catch { return <span key={index}>{part}</span>; }
    })}
  </div>;
}
