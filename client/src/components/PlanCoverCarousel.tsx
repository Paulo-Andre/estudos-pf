import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

type PlanCoverCarouselProps = {
  images?: string[] | null;
  planTitle: string;
};

export function PlanCoverCarousel({ images, planTitle }: PlanCoverCarouselProps) {
  const validImages = Array.from(new Set((images ?? []).filter((url): url is string => typeof url === "string" && url.trim().length > 0))).slice(0, 3);
  if (!validImages.length) return null;

  return <Carousel opts={{ align: "start", loop: validImages.length > 1 }} className="mb-5 overflow-hidden rounded-xl border border-[#cbded8] bg-[#e9f2ef]" aria-label={`Imagens do plano ${planTitle}`}>
    <CarouselContent className="-ml-0">
      {validImages.map((url, index) => <CarouselItem key={url} className="pl-0"><img src={url} alt={`Capa ${index + 1} do plano ${planTitle}`} className="aspect-[16/9] w-full object-cover" loading="lazy" /></CarouselItem>)}
    </CarouselContent>
    {validImages.length > 1 && <><CarouselPrevious className="left-2 border-[#adc8c0] bg-white/95 text-[#173d4a] shadow-sm hover:bg-white" /><CarouselNext className="right-2 border-[#adc8c0] bg-white/95 text-[#173d4a] shadow-sm hover:bg-white" /></>}
  </Carousel>;
}
