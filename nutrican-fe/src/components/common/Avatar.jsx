import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "../../lib/utils";

const Avatar = React.forwardRef(({ src, alt, size = 'md', className = '', ...props }, ref) => {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
  };

  const initials = alt ? alt.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn("relative flex shrink-0 overflow-hidden rounded-full", sizes[size], className)}
      {...props}
    >
      {src && (
        <AvatarPrimitive.Image src={src} alt={alt} className="aspect-square h-full w-full object-cover" />
      )}
      <AvatarPrimitive.Fallback className="flex h-full w-full items-center justify-center rounded-full bg-blue-100 text-blue-600 font-medium">
        {initials}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
});
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = AvatarPrimitive.Image;
const AvatarFallback = AvatarPrimitive.Fallback;

export { Avatar, AvatarImage, AvatarFallback };
export default Avatar;
