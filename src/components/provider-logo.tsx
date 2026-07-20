import Image from "next/image";
import { cn } from "@/lib/utils";
import { providerLogos } from "@/lib/provider-assets";

const sizeClasses = {
  xs: "size-7 rounded-lg",
  sm: "size-9 rounded-xl",
  md: "size-12 rounded-2xl",
};

export function ProviderLogo({
  provider,
  size = "sm",
  className,
}: {
  provider: string;
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  const logo = providerLogos[provider];
  const pixels = size === "xs" ? 28 : size === "sm" ? 36 : 48;
  return (
    <span className={cn(
      "grid shrink-0 place-items-center overflow-hidden border border-black/5 bg-white p-1 shadow-sm",
      sizeClasses[size],
      className,
    )}>
      {logo ? (
        <Image src={logo.src} alt={logo.alt} width={pixels} height={pixels} className="size-full object-contain" />
      ) : (
        <span className="text-xs font-black text-brand">{provider.slice(0, 1)}</span>
      )}
    </span>
  );
}
