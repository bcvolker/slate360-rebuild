import Link from "next/link";
import { MKT_L_BTN_PRIMARY, MKT_L_CONTAINER, MKT_L_KICKER } from "@/app/(public)/_components/marketing-styles-light";

export function HomeWhoPricingLight() {
  return (
    <section className="py-8 sm:py-10">
      <div className={`${MKT_L_CONTAINER} flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between`}>
        <div className="max-w-[62ch]">
          <div className={MKT_L_KICKER}>Quote</div>
          <p className="mt-2 font-serif text-2xl font-normal leading-snug text-[var(--mkt-ink)] sm:text-3xl">
            Contractors across greater Phoenix. A custom quote for the work, on a purchase order or a monthly invoice.
          </p>
        </div>
        <Link href="#request-a-visit" className={`${MKT_L_BTN_PRIMARY} shrink-0`}>
          Get a quote
        </Link>
      </div>
    </section>
  );
}
