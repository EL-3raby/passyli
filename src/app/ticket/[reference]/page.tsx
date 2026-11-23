import type { Metadata } from "next";
import { getBookingByReference } from "@/lib/api/bookings";
import TicketView from "./ticket-view";

interface Props {
  params: Promise<{ reference: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { reference } = await params;
  const decodedRef = decodeURIComponent(reference || "").toUpperCase();
  const booking = await getBookingByReference(decodedRef);

  if (!booking) {
    return {
      title: "تذكرة الحجز | باصيلي",
      description: "منصة باصيلي لحجز ملاعب كرة القدم الخماسي والبادل في دمنهور والبحيرة.",
    };
  }

  const isPadel = booking.court.sport === "padel";
  const playersCount = isPadel ? 4 : 10;
  const cashPerPlayer = Math.ceil(booking.cash_remaining / playersCount);

  // Format Arabic Time
  const [hStr, mStr] = (booking.start_time || "18:00").split(":");
  let h = parseInt(hStr, 10);
  const period = h >= 12 ? "م" : "ص";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  const timeArabic = `${String(h).padStart(2, "0")}:${mStr || "00"} ${period}`;

  const title = `تذكرة ماتش: ${booking.venue.name} — باصيلي`;
  const description = `ميعاد الماتش: ${booking.booking_date} الساعة ${timeArabic} • المطلوب كاش من كل لاعب: ${cashPerPlayer} ج.م • كود: ${booking.booking_reference}`;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://passyli.com";
  const venueImage = booking.venue.images?.[0] || "/images/hero-court.jpg";
  const fullImageUrl = venueImage.startsWith("http") ? venueImage : `${baseUrl}${venueImage}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${baseUrl}/ticket/${decodedRef}`,
      siteName: "باصيلي | Passyli",
      locale: "ar_EG",
      type: "website",
      images: [
        {
          url: fullImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [fullImageUrl],
    },
  };
}

export default async function TicketPage({ params }: Props) {
  const { reference } = await params;
  const decodedRef = decodeURIComponent(reference || "").toUpperCase();
  const initialBooking = await getBookingByReference(decodedRef);

  return <TicketView initialBooking={initialBooking} bookingReference={decodedRef} />;
}
