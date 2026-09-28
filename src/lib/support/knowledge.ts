export type Article = { id: string; title: string; body: string };

/** Conteúdo que o suporte consulta. Sem modelo de linguagem: só estes textos. */
export const ARTICLES: Article[] = [
  {
    id: "produto",
    title: "O que é a extensão",
    body: "O produto é uma extensão de navegador. A assistente funciona dentro dela, na Lovable. Não existe um segundo produto separado. Você compra a licença, instala o arquivo e abre a Lovable.",
  },
  {
    id: "download",
    title: "Download da extensão",
    body: "Com uma licença válida, abra o painel em Download e baixe o arquivo. O link vale cerca de 60 segundos e não fica público. Se nenhuma versão estiver publicada, a mensagem é que o arquivo está indisponível no momento.",
  },
  {
    id: "licenca",
    title: "Licença e teste grátis",
    body: "Conta nova recebe 3 dias de teste no plano Starter. A licença aparece em Licença, no painel. Sem licença ativa o download não é liberado. Você pode revogar a própria chave por lá.",
  },
  {
    id: "pix",
    title: "Pagamento PIX",
    body: "Em Compras, escolha o plano e gere o PIX. Depois de pagar, clique em Já paguei. O pedido fica em conferência até a equipe confirmar no painel admin. A licença só é criada nessa confirmação.",
  },
  {
    id: "revenda",
    title: "Como virar revendedor",
    body: "A revenda não aparece sozinha. Em Configurações, aba Revenda, envie um pedido. Quando o administrador aprovar, o menu Revenda entra na barra. Dá para reservar licença por e-mail: quando a pessoa se cadastra, a chave passa para ela.",
  },
  {
    id: "admin",
    title: "Acesso ao painel admin",
    body: "Crie a conta no site, confirme o e-mail e peça para a equipe marcar o seu perfil como admin. Depois entre em /admin. Cliente comum que abre /admin volta para o painel.",
  },
  {
    id: "dispositivos",
    title: "Dispositivos",
    body: "A lista de dispositivos enche quando a extensão instalada se conecta com a sua licença. Antes da instalação, a lista fica vazia.",
  },
  {
    id: "senha",
    title: "Senha e conta suspensa",
    body: "Na tela de login use Esqueci a senha. O link chega no e-mail. Conta suspensa não entra no painel: a mensagem pede para falar com o suporte.",
  },
];
