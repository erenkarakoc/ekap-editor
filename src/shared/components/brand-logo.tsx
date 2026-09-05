import Image from 'next/image';

export function BrandLogo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex shrink-0 ${className}`} aria-hidden="true">
      <Image
        src="/assets/images/brand/logo_primary_dark.svg"
        alt=""
        width={149}
        height={48}
        loading="eager"
        className="h-full w-auto dark:hidden"
        unoptimized
      />
      <Image
        src="/assets/images/brand/logo_primary_light.svg"
        alt=""
        width={149}
        height={48}
        loading="eager"
        className="hidden h-full w-auto dark:block"
        unoptimized
      />
    </span>
  );
}
