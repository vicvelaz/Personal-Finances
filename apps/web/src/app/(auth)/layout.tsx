
import { T } from "@/components/i18n-provider";export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <p className="mb-8 text-center text-3xl font-bold"><T>fin</T></p>
        {children}
      </div>
    </main>
  );
}
