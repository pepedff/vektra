export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

const MESSAGES: Record<string, string> = {
  not_authenticated: "Sua sessão expirou. Entre novamente.",
  account_suspended: "Sua conta está suspensa. Fale com o suporte.",
  forbidden: "Você não tem permissão para isso.",
  invalid_quantity: "Quantidade inválida.",
  quantity_requires_reseller: "Pacotes com várias licenças são exclusivos para revendedores.",
  too_many_pending_orders: "Você tem muitos pedidos pendentes. Pague ou aguarde antes de gerar outro.",
  plan_not_found: "Plano não encontrado.",
  invalid_coupon: "Cupom inválido, expirado ou esgotado.",
  order_not_payable: "Este pedido não pode mais ser marcado como pago.",
  order_not_found: "Pedido não encontrado.",
  order_not_confirmable: "Este pedido não pode ser confirmado.",
  order_not_rejectable: "Este pedido não pode ser recusado.",
  order_not_refundable: "Só pedidos pagos podem ser reembolsados.",
  license_not_found: "Licença não encontrada.",
  recipient_not_found: "Nenhuma conta encontrada com esse e-mail.",
  cannot_transfer_to_self: "Você não pode transferir para a própria conta.",
  license_not_transferable: "Só licenças ativas do seu estoque podem ser transferidas.",
  pix_key_required: "Cadastre sua chave PIX em Configurações antes de solicitar o saque.",
  invalid_days: "Informe um número de dias entre 1 e 3650.",
  customer_not_found: "Cliente não encontrado.",
  cannot_change_self: "Você não pode alterar o status da própria conta.",
  cannot_demote_self: "Você não pode remover o próprio acesso de admin.",
  cannot_delete_admin: "Administradores não podem ser excluídos.",
  recipients_required: "Selecione ao menos um cliente.",
  invalid_range: "Período inválido.",
  invalid_kind: "Tipo inválido.",
  already_reseller: "Sua conta já pode revender.",
  already_pending: "Você já tem um pedido de revenda em análise.",
  request_not_reviewable: "Esse pedido já foi respondido.",
  invalid_email: "Digite um e-mail válido.",
  version_not_editable: "Só rascunhos podem ser editados.",
  version_not_found: "Versão não encontrada.",
  version_file_required: "Envie o arquivo .zip antes de publicar.",
  license_required: "Você precisa de uma licença válida para baixar a extensão.",
  extension_unavailable: "A extensão está indisponível no momento. Tente de novo em breve.",
};

const FALLBACK = "Algo deu errado. Tente novamente.";

export function isKnownError(error: { message: string; code?: string }): boolean {
  return error.code === "23505" || error.message in MESSAGES;
}

export function friendlyError(error: { message: string; code?: string }): string {
  if (error.code === "23505") return "Já existe um registro com esse código.";
  return MESSAGES[error.message] ?? FALLBACK;
}
