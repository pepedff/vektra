import { beforeAll, describe, expect, it } from "vitest";
import { asUser, createDb, createUser, promote, type Db } from "./harness";

type OrderRow = { id: string; status: string; amount_cents: number; unit_price_cents: number; discount_cents: number };

let db: Db;
let admin: string;
let alice: string;
let bob: string;

beforeAll(async () => {
  db = await createDb();
  admin = await createUser(db, "admin@vektra.test", { full_name: "Admin" });
  await promote(db, admin, "admin");
  alice = await createUser(db, "alice@vektra.test", { full_name: "Alice" });
  const code = await db.query<{ referral_code: string }>(
    "select referral_code from public.profiles where id = $1",
    [alice],
  );
  bob = await createUser(db, "bob@vektra.test", { full_name: "Bob", ref: code.rows[0].referral_code.toLowerCase() });
});

async function createOrder(userId: string, plan = "pro", qty = 1, coupon: string | null = null): Promise<OrderRow> {
  return asUser(db, userId, async () => {
    const res = await db.query<OrderRow>("select * from public.create_order($1, $2, $3)", [plan, qty, coupon]);
    return res.rows[0];
  });
}

describe("cadastro", () => {
  it("cria perfil com código de indicação e vínculo do indicador", async () => {
    const res = await db.query<{ full_name: string; role: string; referred_by: string | null; referral_code: string }>(
      "select full_name, role, referred_by, referral_code from public.profiles where id = $1",
      [bob],
    );
    expect(res.rows[0]).toMatchObject({ full_name: "Bob", role: "client", referred_by: alice });
    expect(res.rows[0].referral_code).toMatch(/^[A-F0-9]{8}$/);
  });

  it("libera licença de teste de 3 dias no cadastro", async () => {
    const res = await db.query<{ status: string; plan_id: string; days: number }>(
      "select status, plan_id, round(extract(epoch from expires_at - now()) / 86400)::int as days from public.licenses where owner_id = $1",
      [bob],
    );
    expect(res.rows).toEqual([{ status: "teste", plan_id: "starter", days: 3 }]);
  });
});

describe("RLS de perfis", () => {
  it("anônimo não lê perfis mas lê planos", async () => {
    await asUser(db, null, async () => {
      await expect(db.query("select * from public.profiles")).rejects.toThrow(/permission denied/);
      const plans = await db.query("select id from public.plans order by sort");
      expect(plans.rows).toHaveLength(3);
    });
  });

  it("cliente vê só o próprio perfil", async () => {
    const rows = await asUser(db, alice, () => db.query<{ id: string }>("select id from public.profiles"));
    expect(rows.rows.map((r) => r.id)).toEqual([alice]);
  });

  it("cliente edita nome mas não consegue virar admin", async () => {
    await asUser(db, alice, async () => {
      await db.query("update public.profiles set full_name = 'Alice S.' where id = $1", [alice]);
      await expect(db.query("update public.profiles set role = 'admin' where id = $1", [alice])).rejects.toThrow(
        /permission denied/,
      );
    });
  });

  it("admin vê todos os perfis", async () => {
    const rows = await asUser(db, admin, () => db.query("select id from public.profiles"));
    expect(rows.rows.length).toBe(3);
  });
});

describe("pedidos", () => {
  it("preço é calculado no servidor", async () => {
    const order = await createOrder(alice);
    expect(order).toMatchObject({ status: "pendente", amount_cents: 11990 });
  });

  it("cliente não insere pedido direto na tabela", async () => {
    await asUser(db, alice, async () => {
      await expect(
        db.query(
          "insert into public.orders (user_id, plan_id, unit_price_cents, amount_cents, pix_txid) values ($1, 'pro', 1, 1, 'X1')",
          [alice],
        ),
      ).rejects.toThrow(/permission denied/);
    });
  });

  it("cliente comum não compra pacote de revenda", async () => {
    await expect(createOrder(alice, "scale", 5)).rejects.toThrow(/quantity_requires_reseller/);
  });

  it("aplica cupom válido e rejeita inválido", async () => {
    await db.query(
      "insert into public.coupons (code, percent_off, max_uses, expires_at) values ('VEKTRA10', 10, 5, now() + interval '1 day')",
    );
    const order = await createOrder(bob, "pro", 1, "vektra10");
    expect(order).toMatchObject({ discount_cents: 1199, amount_cents: 10791 });
    await expect(createOrder(bob, "pro", 1, "NAOEXISTE")).rejects.toThrow(/invalid_coupon/);
  });

  it("revendedor compra pacote com 30% off por unidade", async () => {
    const reseller = await createUser(db, "revenda@vektra.test");
    await promote(db, reseller, "reseller");
    const order = await createOrder(reseller, "starter", 10);
    expect(order).toMatchObject({ unit_price_cents: 3493, amount_cents: 34930 });
  });

  it("cliente não vê pedidos de outros", async () => {
    const rows = await asUser(db, bob, () => db.query<{ user_id: string }>("select user_id from public.orders"));
    expect(rows.rows.length).toBeGreaterThan(0);
    expect(rows.rows.every((r) => r.user_id === bob)).toBe(true);
  });

  it("só o dono marca como pago", async () => {
    const order = await createOrder(alice, "starter");
    await asUser(db, bob, async () => {
      await expect(db.query("select public.mark_order_paid($1)", [order.id])).rejects.toThrow(/order_not_payable/);
    });
    const res = await asUser(db, alice, () =>
      db.query<{ status: string }>("select status from public.mark_order_paid($1)", [order.id]),
    );
    expect(res.rows[0].status).toBe("aguardando");
  });
});

describe("confirmação de pagamento", () => {
  it("cliente não confirma o próprio pedido", async () => {
    const order = await createOrder(alice, "starter");
    await asUser(db, alice, async () => {
      await expect(db.query("select public.confirm_order($1)", [order.id])).rejects.toThrow(/forbidden/);
    });
  });

  it("admin confirma, emite licença, notifica e é idempotente", async () => {
    const order = await createOrder(alice, "pro");
    await asUser(db, admin, async () => {
      await db.query("select public.confirm_order($1)", [order.id]);
      await db.query("select public.confirm_order($1)", [order.id]);
    });

    const licenses = await db.query<{ key: string; owner_id: string }>(
      "select key, owner_id from public.licenses where order_id = $1",
      [order.id],
    );
    expect(licenses.rows).toHaveLength(1);
    expect(licenses.rows[0].key).toMatch(/^VKT-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);

    const aliceSees = await asUser(db, alice, () =>
      db.query<{ title: string }>("select title from public.notifications where title = 'Pagamento confirmado'"),
    );
    expect(aliceSees.rows).toHaveLength(1);
    const bobSees = await asUser(db, bob, () =>
      db.query("select title from public.notifications where title = 'Pagamento confirmado'"),
    );
    expect(bobSees.rows).toHaveLength(0);
  });

  it("reembolso revoga as licenças do pedido", async () => {
    const order = await createOrder(bob, "starter");
    await asUser(db, admin, async () => {
      await db.query("select public.confirm_order($1)", [order.id]);
      await db.query("select public.refund_order($1)", [order.id]);
    });
    const res = await db.query<{ status: string }>("select status from public.licenses where order_id = $1", [order.id]);
    expect(res.rows.map((r) => r.status)).toEqual(["revogada"]);
  });

  it("recusa pedido aguardando e bloqueia confirmação posterior", async () => {
    const order = await createOrder(bob, "starter");
    await asUser(db, admin, async () => {
      await db.query("select public.reject_order($1, $2)", [order.id, "PIX não encontrado"]);
      await expect(db.query("select public.confirm_order($1)", [order.id])).rejects.toThrow(/order_not_confirmable/);
    });
  });
});

describe("admin", () => {
  it("métricas e série de receita só para admin", async () => {
    await asUser(db, alice, async () => {
      await expect(db.query("select public.admin_metrics()")).rejects.toThrow(/forbidden/);
    });
    const series = await asUser(db, admin, () =>
      db.query<{ value_cents: string }>("select * from public.revenue_series('7d')"),
    );
    expect(series.rows).toHaveLength(7);
    expect(series.rows.reduce((acc, r) => acc + Number(r.value_cents), 0)).toBeGreaterThan(0);
  });

  it("emite licença manual e renova", async () => {
    const res = await asUser(db, admin, () =>
      db.query<{ id: string }>("select * from public.issue_license($1, 'pro', 7, 2)", [bob]),
    );
    expect(res.rows).toHaveLength(2);
    await asUser(db, admin, () => db.query("select public.extend_license($1, 30)", [res.rows[0].id]));
  });

  it("suspende cliente e ele não cria pedidos", async () => {
    await asUser(db, admin, () => db.query("select public.set_customer_status($1, 'suspenso')", [bob]));
    await expect(createOrder(bob)).rejects.toThrow(/account_suspended/);
    await asUser(db, admin, () => db.query("select public.set_customer_status($1, 'ativo')", [bob]));
  });

  it("notificação por plano chega só a quem tem o plano", async () => {
    await asUser(db, admin, () =>
      db.query("select public.send_notification('Aviso Scale', 'Mensagem só para o plano Scale.', 'info', 'plano', $1, true)", [
        JSON.stringify({ plan_id: "scale" }),
      ]),
    );
    const aliceSees = await asUser(db, alice, () =>
      db.query("select id from public.notifications where title = 'Aviso Scale'"),
    );
    expect(aliceSees.rows).toHaveLength(0);
  });

  it("logs de auditoria invisíveis para clientes e função interna bloqueada", async () => {
    await asUser(db, alice, async () => {
      const logs = await db.query("select id from public.audit_logs");
      expect(logs.rows).toHaveLength(0);
      await expect(db.query("select public.log_event('info', 'forjado')")).rejects.toThrow(/permission denied/);
    });
    const logs = await asUser(db, admin, () => db.query("select id from public.audit_logs"));
    expect(logs.rows.length).toBeGreaterThan(0);
  });

  it("admin não exclui outro admin; exclui cliente", async () => {
    const other = await createUser(db, "tmp@vektra.test");
    await asUser(db, admin, async () => {
      await expect(db.query("select public.delete_customer($1)", [admin])).rejects.toThrow(/cannot_delete_admin/);
      await db.query("select public.delete_customer($1)", [other]);
    });
    const res = await db.query("select id from public.profiles where id = $1", [other]);
    expect(res.rows).toHaveLength(0);
  });
});

describe("my_notifications", () => {
  type Row = { id: string; title: string; seen: boolean; dismissed: boolean };

  it("lista só o que o usuário pode ver, com estado de leitura", async () => {
    const alices = await asUser(db, alice, () => db.query<Row>("select * from public.my_notifications()"));
    const titles = alices.rows.map((r) => r.title);
    expect(titles).toContain("Pagamento confirmado");
    expect(titles).not.toContain("Aviso Scale");

    const target = alices.rows[0];
    await asUser(db, alice, () =>
      db.query("insert into public.notification_reads (user_id, notification_id, dismissed_at) values ($1, $2, now())", [alice, target.id]),
    );
    const after = await asUser(db, alice, () => db.query<Row>("select * from public.my_notifications()"));
    expect(after.rows.find((r) => r.id === target.id)).toMatchObject({ seen: true, dismissed: true });
  });

  it("admin no painel do cliente não recebe avisos individuais de outros", async () => {
    const rows = await asUser(db, admin, () => db.query<Row>("select * from public.my_notifications()"));
    expect(rows.rows.map((r) => r.title)).not.toContain("Pagamento confirmado");
  });

  it("usuário não marca leitura em nome de outro", async () => {
    const n = await db.query<{ id: string }>("select id from public.notifications limit 1");
    await asUser(db, bob, async () => {
      await expect(
        db.query("insert into public.notification_reads (user_id, notification_id) values ($1, $2)", [alice, n.rows[0].id]),
      ).rejects.toThrow(/row-level security/);
    });
  });
});
