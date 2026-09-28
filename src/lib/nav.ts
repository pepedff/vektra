import {
  BadgePercent,
  Bell,
  Blocks,
  Bot,
  CreditCard,
  Download,
  FileArchive,
  Gauge,
  KeyRound,
  MessageSquare,
  MonitorSmartphone,
  Package,
  Palette,
  Puzzle,
  RefreshCw,
  ScrollText,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Store,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const CLIENT_NAV: NavGroup[] = [
  {
    label: "Extensão",
    items: [
      { label: "Visão geral", href: "/painel", icon: Puzzle, description: "Status da extensão e da sua licença." },
      { label: "Download", href: "/painel/download", icon: Download, description: "Baixe a versão autorizada da extensão." },
      { label: "Licença", href: "/painel/licenca", icon: KeyRound, description: "Chaves vinculadas à sua conta." },
      { label: "Atualizações", href: "/painel/atualizacoes", icon: RefreshCw, description: "Novidades das versões publicadas." },
      { label: "Dispositivos", href: "/painel/dispositivos", icon: MonitorSmartphone, description: "Onde a extensão está ativa." },
    ],
  },
  {
    label: "Conta",
    items: [
      { label: "Compras", href: "/painel/compras", icon: ShoppingBag, description: "Planos e novas licenças da extensão." },
      { label: "Pagamentos", href: "/painel/pagamentos", icon: Wallet, description: "Histórico de cobranças PIX." },
      { label: "Configurações", href: "/painel/configuracoes", icon: Settings, description: "Perfil, segurança e pedido de revenda." },
    ],
  },
];

export const RESELLER_NAV: NavGroup = {
  label: "Revenda",
  items: [
    { label: "Dashboard", href: "/painel/revenda", icon: Gauge, description: "Estoque e licenças da sua revenda." },
    { label: "Clientes", href: "/painel/revenda-clientes", icon: Users, description: "Licenças reservadas e repassadas." },
    { label: "Licenças", href: "/painel/revenda-licencas", icon: KeyRound, description: "Estoque e reservas por e-mail." },
    { label: "Vendas", href: "/painel/revenda-vendas", icon: ShoppingBag, description: "Pacotes e pedidos da revenda." },
    { label: "Configurações", href: "/painel/revenda-config", icon: SlidersHorizontal, description: "Marca própria, se o admin liberar." },
  ],
};

export const ADMIN_NAV: NavGroup[] = [
  {
    label: "Visão geral",
    items: [{ label: "Dashboard", href: "/admin", icon: Gauge, description: "Receita, clientes e conversão." }],
  },
  {
    label: "Clientes",
    items: [
      { label: "Usuários", href: "/admin/usuarios", icon: Users, description: "Base de clientes, planos e status." },
      { label: "Licenças", href: "/admin/licencas", icon: KeyRound, description: "Todas as licenças da extensão." },
      { label: "Dispositivos", href: "/admin/dispositivos", icon: MonitorSmartphone, description: "Instalações da extensão." },
    ],
  },
  {
    label: "Vendas",
    items: [
      { label: "Pedidos", href: "/admin/pedidos", icon: ShoppingBag, description: "Pedidos da loja." },
      { label: "Pagamentos", href: "/admin/pagamentos", icon: CreditCard, description: "PIX confirmados e recusados." },
      { label: "Cupons", href: "/admin/cupons", icon: BadgePercent, description: "Descontos e limites de uso." },
    ],
  },
  {
    label: "Revenda",
    items: [
      { label: "Revendedores", href: "/admin/revendedores", icon: Store, description: "Parceiros e permissões." },
      { label: "Solicitações", href: "/admin/solicitacoes", icon: UserPlus, description: "Pedidos para virar revendedor." },
      { label: "Licenças de revenda", href: "/admin/licencas-revenda", icon: Package, description: "Licenças emitidas por revendedores." },
    ],
  },
  {
    label: "Extensão",
    items: [
      { label: "Visão geral", href: "/admin/extensao", icon: Puzzle, description: "Versão publicada e configuração." },
      { label: "Versões", href: "/admin/versoes", icon: Blocks, description: "Rascunhos, publicação e changelog." },
      { label: "Arquivos", href: "/admin/arquivos", icon: FileArchive, description: "ZIP oficial de cada versão." },
      { label: "Downloads", href: "/admin/downloads", icon: Download, description: "Quem baixou a extensão." },
      { label: "Personalização", href: "/admin/personalizacao", icon: Palette, description: "Nome, cores e identidade." },
      { label: "Interface", href: "/admin/interface", icon: Sparkles, description: "Cards, inputs, chat e tipografia." },
      { label: "Comportamento", href: "/admin/comportamento", icon: SlidersHorizontal, description: "Mensagens e sugestões iniciais." },
      { label: "Configuração da IA", href: "/admin/ia", icon: Bot, description: "A agent embutida na extensão." },
      { label: "Prompts", href: "/admin/prompts", icon: MessageSquare, description: "Prompt do sistema e mensagem inicial." },
      { label: "Modelos", href: "/admin/modelos", icon: Bot, description: "Modelo, temperatura e limites." },
      { label: "Atualizações", href: "/admin/atualizacoes", icon: RefreshCw, description: "Histórico publicado para os clientes." },
    ],
  },
  {
    label: "Sistema",
    items: [
      { label: "Notificações", href: "/admin/notificacoes", icon: Bell, description: "Avisos em tempo real." },
      { label: "Logs", href: "/admin/logs", icon: ScrollText, description: "Eventos e auditoria." },
      { label: "Configurações", href: "/admin/configuracoes", icon: Settings, description: "Conta e PIX da loja." },
    ],
  },
];

export function clientNav(isReseller: boolean): NavGroup[] {
  return isReseller ? [...CLIENT_NAV, RESELLER_NAV] : CLIENT_NAV;
}

export function findNavItem(groups: NavGroup[], pathname: string): NavItem | undefined {
  const items = groups.flatMap((g) => g.items);
  return items.find((i) => i.href === pathname) ?? items[0];
}
