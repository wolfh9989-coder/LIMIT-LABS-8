import type { Metadata } from "next";
import { Orbitron, Space_Grotesk } from "next/font/google";
import { AccountTrackingBanner } from "@/components/AccountTrackingBanner";
import { HideNextDevBadge } from "@/components/HideNextDevBadge";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LIMIT LABS 8 | AI Mobile Video & Content Studio",
  description:
    "Turn one input into scripts, clips, captions, tweets, overlays, and brand-ready mobile content.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${orbitron.variable} h-full antialiased`}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700&family=DM+Sans:wght@300;400;700&family=Manrope:wght@300;400;700&family=Work+Sans:wght@300;400;700&family=Source+Sans+3:wght@300;400;700&family=Montserrat:wght@300;400;700&family=Poppins:wght@300;400;700&family=Nunito:wght@300;400;700&family=Quicksand:wght@300;400;700&family=Mulish:wght@300;400;700&family=Comfortaa:wght@300;400;700&family=Kanit:wght@400;700&family=Oswald:wght@300;400;700&family=Teko:wght@400;700&family=Barlow+Condensed:wght@400;700&family=Anton&family=Bebas+Neue&family=Archivo+Black&family=Black+Ops+One&family=Rubik+Mono+One&family=Russo+One&family=Unica+One&family=Righteous&family=Orbitron:wght@400;700&family=Rajdhani:wght@400;700&family=Exo+2:wght@400;700&family=Audiowide&family=Saira:wght@400;700&family=Oxanium:wght@400;700&family=Michroma&family=Syncopate:wght@400;700&family=Major+Mono+Display&family=Share+Tech+Mono&family=Press+Start+2P&family=VT323&family=Silkscreen&family=Chakra+Petch:wght@400;700&family=Monoton&family=Megrim&family=Cinzel:wght@400;700&family=Playfair+Display:wght@400;700&family=DM+Serif+Display&family=Merriweather:wght@400;700&family=Cormorant+Garamond:wght@400;700&family=Libre+Baskerville:wght@400;700&family=Lora:wght@400;700&family=Prata&family=Marcellus&family=Pacifico&family=Great+Vibes&family=Caveat:wght@400;700&family=Patrick+Hand&family=Dancing+Script:wght@400;700&family=Satisfy&family=Parisienne&family=Shadows+Into+Light&family=Architects+Daughter&family=Kalam:wght@400;700&family=Handlee&family=Indie+Flower&family=Permanent+Marker&family=Bangers&family=Luckiest+Guy&family=Comic+Neue:wght@300;400;700&family=Baloo+2:wght@400;700&family=Bubblegum+Sans&family=Chewy&family=Sniglet:wght@400;800&family=Creepster&family=Nosifer&family=Butcherman&family=Special+Elite&family=Tangerine:wght@400;700&family=Abril+Fatface&family=Alfa+Slab+One&family=Bungee&family=Bungee+Shade&family=Cabin+Condensed:wght@400;700&family=Fjalla+One&family=IBM+Plex+Sans:wght@300;400;700&family=IBM+Plex+Mono:wght@300;400;700&family=Libre+Franklin:wght@300;400;700&family=Noto+Sans:wght@300;400;700&family=PT+Sans:wght@400;700&family=Roboto+Condensed:wght@300;400;700&family=Titillium+Web:wght@300;400;700&family=Ubuntu:wght@300;400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <HideNextDevBadge />
        <AccountTrackingBanner />
        {children}
      </body>
    </html>
  );
}
