import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/cn";

export function SectionHeading({
  title,
  description,
  align = "center",
  className,
}: {
  title: React.ReactNode;
  description?: string;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div className={cn("max-w-[640px]", align === "center" && "mx-auto text-center", className)}>
      <Reveal as="h2" className="text-[32px] leading-[1.1] font-bold tracking-[-0.03em] text-balance md:text-[42px]">
        {title}
      </Reveal>
      {description && (
        <Reveal as="p" delay={0.08} className="mt-4 text-[16px] leading-relaxed text-muted text-pretty">
          {description}
        </Reveal>
      )}
    </div>
  );
}
