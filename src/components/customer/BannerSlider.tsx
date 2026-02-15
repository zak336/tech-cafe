'use client'

import useEmblaCarousel from 'embla-carousel-react'
import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Banner } from '@/types'
import { cn } from '@/lib/utils'

export default function BannerSlider({ banners }: { banners: Banner[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' })
  const [selected, setSelected] = useState(0)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelected(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    emblaApi.on('select', onSelect)
    // Auto-play
    const interval = setInterval(() => emblaApi.scrollNext(), 4000)
    return () => { clearInterval(interval); emblaApi.off('select', onSelect) }
  }, [emblaApi, onSelect])

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
        <div className="flex">
          {banners.map(banner => (
            <BannerSlide key={banner.id} banner={banner} />
          ))}
        </div>
      </div>

      {/* Dots */}
      {banners.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              className={cn(
                'rounded-full transition-all duration-300',
                i === selected ? 'bg-gold w-5 h-1.5' : 'bg-border w-1.5 h-1.5'
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function BannerSlide({ banner }: { banner: Banner }) {
  const content = (
    <div className="relative flex-shrink-0 w-full aspect-[2.5/1] overflow-hidden rounded-2xl bg-surface-2">
      {banner.image_url && (
        <Image
          src={banner.image_url}
          alt={banner.title ?? 'Banner'}
          fill
          className="object-cover"
        />
      )}
      {/* Overlay text */}
      {(banner.title || banner.subtitle) && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-4">
          {banner.title    && <h3 className="font-display text-xl font-bold text-white">{banner.title}</h3>}
          {banner.subtitle && <p className="text-sm text-white/80 mt-0.5">{banner.subtitle}</p>}
        </div>
      )}
    </div>
  )

  if (banner.link_type === 'url' && banner.link_value) {
    return <Link href={banner.link_value} className="min-w-full">{content}</Link>
  }

  return <div className="min-w-full">{content}</div>
}
