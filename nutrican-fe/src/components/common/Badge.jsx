// src/components/common/Badge.jsx
import { Badge as BadgeRoot } from '../ui/badge';

function Badge({ children, variant = 'default', className = '', ...props }) {
  return (
    <BadgeRoot variant={variant} className={className} {...props}>
      {children}
    </BadgeRoot>
  );
}

export default Badge;
