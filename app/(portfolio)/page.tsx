import PortfolioContent from "@/components/PortfolioContent";

export const revalidate = 60;

export default async function Home() {
  return (
    <main className="min-h-screen">
      <PortfolioContent />
    </main>
  );
}
