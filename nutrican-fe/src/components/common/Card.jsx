// src/components/common/Card.jsx
import { Card as CardRoot, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';

function Card({ children, className = '', padding = true, ...props }) {
  return (
    <CardRoot className={`${padding ? '' : 'p-0'} ${className}`} {...props}>
      {children}
    </CardRoot>
  );
}

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Content = CardContent;
Card.Footer = CardFooter;

export default Card;
export { CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
