import Image from "next/image";

type Variant = "white" | "blue";
type Size = "sm" | "md" | "lg";

interface Props {
  variant?: Variant;
  size?: Size;
  className?: string;
}

const PX: Record<Size, number> = {
  sm: 32,
  md: 40,
  lg: 48,
};

export default function Logo({
  variant = "blue",
  size = "md",
  className = "",
}: Props) {
  const px = PX[size];
  const src = variant === "white" ? "/logo_white.png" : "/logo_blue.png";

  return (
    <Image
      src={src}
      alt="Sovereign Dialect Bridge"
      width={px}
      height={px}
      priority
      className={`rounded-xl flex-shrink-0 ${className}`}
    />
  );
}
