import { Calendar, MapPin } from "lucide-react";
import { churchDisplayName } from "@/lib/churches";
import { EVENT } from "@/lib/constants";

const LOGOS = [
  { src: "/images/iemeliflogo.png", alt: "IEMELIF", className: "h-7 w-7 sm:h-12 sm:w-12" },
  { src: "/images/lagunalogo.png", alt: "Laguna Batangas Quezon", className: "h-7 w-7 sm:h-12 sm:w-12" },
  { src: "/images/cwmlogo.png", alt: "Committee on Ways and Means District IV East", className: "h-7 w-7 sm:h-12 sm:w-12" },
  { src: "/images/funrunlogo.png", alt: "AGOS 2026 Family Run", className: "h-8 w-auto max-w-[4.75rem] sm:h-14 sm:max-w-[7rem]" },
] as const;

function TicketWaves() {
  return (
    <svg
      className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full sm:h-24"
      viewBox="0 0 1024 160"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d="M0 160V86c90-38 180-58 280-48 140 14 210 70 360 62 130-8 230-54 384-70v130H0Z" fill="#00acc1" />
      <path d="M0 160V108c110-28 220-40 330-22 150 24 230 58 390 42 110-12 200-40 304-52v84H0Z" fill="#7ec8e3" />
      <path d="M0 160V128c130-18 250-8 390 10 160 20 250 8 390-8 90-10 170-8 244 6v24H0Z" fill="#ff8f00" />
    </svg>
  );
}

export function TicketCard({
  ticketId,
  churchCode,
  otherChurchName,
}: {
  ticketId: string;
  churchCode: string;
  otherChurchName?: string | null;
}) {
  const churchName = churchDisplayName(churchCode, otherChurchName).toUpperCase();

  return (
    <article className="print-ticket overflow-hidden rounded-[18px] bg-white shadow-2xl shadow-navy/20 sm:rounded-[22px]">
      <div className="flex items-center justify-between gap-2 bg-white px-2.5 py-2 sm:gap-4 sm:px-6 sm:py-4">
        <div className="flex items-center gap-0.5 sm:gap-2.5">
          {LOGOS.map((logo, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${logo.src}-${index}`}
              src={logo.src}
              alt={logo.alt}
              className={`${logo.className} shrink-0 object-contain`}
            />
          ))}
        </div>
        <p className="shrink-0 text-right text-[8px] font-extrabold uppercase leading-[1.1] tracking-wide sm:text-lg sm:leading-[1.12]">
          <span className="block text-navy">ONE FAMILY.</span>
          <span className="block text-teal">ONE RUN.</span>
          <span className="block text-orange">ONE AGOS.</span>
        </p>
      </div>

      <div className="flex h-1 sm:h-1.5">
        <div className="flex-1 bg-orange" />
        <div className="flex-1 bg-teal" />
      </div>

      <div className="relative min-h-[148px] overflow-hidden bg-navy sm:min-h-[248px]">
        <TicketWaves />
        <div className="relative z-10 flex min-h-[148px] flex-col items-center justify-center px-3 py-6 text-center sm:min-h-[248px] sm:px-6 sm:py-10">
          <p className="text-2xl font-extrabold tracking-wide text-white drop-shadow-md sm:text-6xl">{ticketId}</p>
          <p className="mt-1.5 max-w-full px-1 text-[11px] font-bold tracking-wide text-white sm:mt-3 sm:text-2xl sm:tracking-[0.12em]">
            {churchName}
          </p>
        </div>
      </div>

      <div className="bg-white px-2.5 py-2.5 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-1.5 rounded-2xl bg-navy px-3 py-2.5 text-[9px] font-semibold leading-snug text-white sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:rounded-full sm:px-6 sm:py-3.5 sm:text-sm">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3 w-3 shrink-0 text-white sm:h-4 sm:w-4" />
            {EVENT.dateLabel}
          </span>
          <span className="hidden h-8 w-px bg-white/40 sm:block" />
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MapPin className="h-3 w-3 shrink-0 text-white sm:h-4 sm:w-4" />
            <span className="whitespace-nowrap">{EVENT.location}</span>
          </span>
          <span className="hidden h-8 w-px bg-white/40 sm:block" />
          <span className="break-all">{EVENT.hashtag}</span>
        </div>
      </div>
    </article>
  );
}
