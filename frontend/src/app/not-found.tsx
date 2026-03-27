import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-background text-foreground px-4">
      <h2 className="text-4xl font-black">404</h2>
      <p className="text-xl font-bold">Página no encontrada</p>
      <p className="text-muted-foreground text-sm">La página que buscas no existe o fue movida.</p>
      <Link
        href="/"
        className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
      >
        Ir al inicio
      </Link>
    </div>
  );
}
