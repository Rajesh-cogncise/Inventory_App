import PluginInit from "@/helper/PluginInit";
import "./font.css";
import "./globals.css";
import ClientLayout from "./ClientLayout";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { headers } from 'next/headers';

export const metadata = {
  title: "Cogncise - Asset Management System",
  description:
    "Wowdash NEXT JS is a developer-friendly, ready-to-use admin template designed for building attractive, scalable, and high-performing web applications.",
};

export default async function RootLayout({ children }) {
  const session = getServerSession(authOptions);
  const headerList = await headers();
  let user = await session;
  const pathname = headerList.get('x-pathname');

  const isAuthPage = pathname === '/sign-in' || pathname === '/forgot-password';
  
  if (!Boolean(user) && !isAuthPage) {
    redirect("/sign-in");
  };
  return (
    <html lang="en">
      <PluginInit />
      <body suppressHydrationWarning={true}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
