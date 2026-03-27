// Layout cho Landing Page - Không có Navbar
// Route group (landing) không ảnh hưởng URL

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
