// src/components/common/Input.jsx
import { Input as InputRoot } from '../ui/input';
import { Label } from '../ui/label';

function Input({ label, error, className = '', ...props }) {
  return (
    <div className="w-full space-y-1.5">
      {label && <Label htmlFor={props.id}>{label}</Label>}
      <InputRoot
        className={`${error ? 'border-red-500 focus-visible:ring-red-500' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

export default Input;
