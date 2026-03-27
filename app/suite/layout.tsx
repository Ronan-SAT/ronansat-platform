// Layout cho Main App (/suite) - Có Navbar
import Navbar from "@/components/Navbar";

export default function SuiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
