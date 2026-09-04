import Image from "next/image";
import Link from "next/link";

export default function BrandMark({ className = "", size = 40 }) {
  return (
    <Link
      href="/"
      aria-label="Koussay Zayani — home"
      className={`inline-block leading-none transition-opacity hover:opacity-70 ${className}`.trim()}
    >
      <Image src="/logo.png" alt="" width={size} height={size} priority />
    </Link>
  );
}
