import type { Metadata } from "next";

const getBaseUrl = () => {
  if (process.env.VERCEL) return "https://anime-kana.vercel.app";
  if (process.env.NODE_ENV === "production") return "https://ayaya-kana.id.vn";
  return "https://93d61f85463e.ngrok-free.app";
};

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: "Xưởng Phép Thuật",
  description: "Witch Hat Atelier - とんがり帽子のアトリエ | Web coi anime thay gdrive!",
  openGraph: {
    title: "Xưởng Phép Thuật",
    description: "Witch Hat Atelier - とんがり帽子のアトリエ | Web coi anime thay gdrive!",
    url: `${getBaseUrl()}/wha`,
    siteName: "Ayaya Webpage",
    images: [
      {
        url: `${getBaseUrl()}/images/witchhatatelier.jpg`,
        width: 1200,
        height: 630,
        alt: "Xưởng Phép Thuật - Witch Hat Atelier",
        type: "image/jpeg",
      },
    ],
    locale: "vi_VN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Xưởng Phép Thuật",
    description: "Witch Hat Atelier - とんがり帽子のアトリエ | Web coi anime thay gdrive!",
    images: [`${getBaseUrl()}/images/witchhatatelier.jpg`],
    creator: "@ayaya_webpage",
  },
};

export default function WhaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
