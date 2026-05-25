import { Button as ButtonRoot } from '../ui/button';
import { Loader2 } from 'lucide-react';

function Button({ children, variant = 'default', size = 'default', disabled = false, loading = false, className = '', ...props }) {
  return (
    <ButtonRoot
      variant={variant === 'primary' ? 'default' : variant}
      size={size}
      disabled={disabled || loading}
      className={className}
      {...props}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </ButtonRoot>
  );
}

export default Button;
