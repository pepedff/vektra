import Link from "next/link";
import { Logo } from "@/components/logo";

const COLUMNS = [
  {
    title: "Produto",
    links: [
      { label: "Planos", href: "#planos" },
      { label: "Como funciona", href: "#como-funciona" },
      { label: "Painel do cliente", href: "/painel" },
    ],
  },
  {
    title: "Extensão",
    links: [
      { label: "Download", href: "/painel/download" },
      { label: "Revenda", href: "/painel/configuracoes" },
    ],
  },
  {
    title: "Ajuda",
    links: [
      { label: "Dúvidas", href: "#duvidas" },
      { label: "Suporte", href: "#suporte" },
      { label: "Status do sistema", href: "#suporte" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)] md:px-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-[280px] text-[13.5px] leading-relaxed text-muted">
            Licenças com créditos ilimitados para quem cria com IA todos os dias.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="text-[13px] font-semibold text-fg">{col.title}</p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-[13.5px] text-muted transition-colors hover:text-fg">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-5 py-6 text-[12.5px] text-subtle sm:flex-row sm:justify-between md:px-8">
          <p>© 2026 Vektra Tecnologia Ltda. Todos os direitos reservados.</p>
          <p className="flex gap-5">
            <Link href="#" className="hover:text-fg">Termos</Link>
            <Link href="#" className="hover:text-fg">Privacidade</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
