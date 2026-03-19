import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Google Live • Real-Time Location Sharing",
  description: "Sajal Shaw is sharing their real-time location with you. Tap to view on the live map.",
  openGraph: {
    title: "\uD83D\uDCCD Live Location • Sajal Shaw",
    description: "Purusottam Enclave Rd, Nandan Vihar, Patia, Bhubaneswar, Odisha 751024",
    url: "https://googlelive.vercel.app",
    siteName: "Google Live",
    images: [
      {
        // IMPORTANT: Insert your Mapbox access token in an environment variable and load it securely.
        url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l-marker+ff0000(85.8245,20.3541)/85.8245,20.3541,14,0/600x315@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`,
        width: 1200,
        height: 630,
        alt: "Live location map - Patia, Bhubaneswar",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "\uD83D\uDCCD Live Location • Sajal Shaw",
    description: "Purusottam Enclave Rd, Nandan Vihar, Patia, Bhubaneswar",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isLive = process.env.NEXT_PUBLIC_END_MODE === 'true';

  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={`${roboto.className} min-h-full flex flex-col`}>
        {isLive ? (
          children
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <div className="max-w-md space-y-4">
              <h1 className="text-2xl font-medium text-gray-900">
                Live location has ended
              </h1>
              <p className="text-gray-500">
                The real-time location sharing session has concluded. This link is no longer active.
              </p>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
