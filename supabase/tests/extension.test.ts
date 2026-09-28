import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createDb, createUser, promote, type Db } from "./harness";

let db: Db;
let admin: string;
let alice: string;
let bob: string;

beforeAll(async () => {
  db = await createDb();
  admin = await createUser(db, "admin@t.com", { full_name: "Ada Admin" });
  alice = await createUser(db, "alice@t.com", { full_name: "Alice Teste" });
  bob = await createUser(db, "bob@t.com", { full_name: "Bob Teste" });
  await promote(db, admin, "admin");
});

afterAll(async () => {
  await db.close();
});

describe("pedido de revenda", () => {
  it("cliente pede e admin aprova com permissões", async () => {
    await asUser(db, alice, () => db.query("select public.request_reseller($1)", ["Quero vender a extensão para minha base."]));
    const pending = await asUser(db, admin, () =>
      db.query<{ id: string; status: string }>("select id, status from public.reseller_requests where user_id = $1", [alice]),
    );
    expect(pending.rows[0].status).toBe("pendente");

    await asUser(db, admin, () =>
      db.query("select public.review_reseller_request($1, true, $2::jsonb)", [
        pending.rows[0].id,
        JSON.stringify({ create_licenses: true, own_brand: true, view_sales: true }),
      ]),
    );

    const role = await db.query<{ role: string }>("select role from public.profiles where id = $1", [alice]);
    expect(role.rows[0].role).toBe("reseller");
    const perms = await db.query<{ own_brand: boolean }>("select own_brand from public.reseller_permissions where user_id = $1", [alice]);
    expect(perms.rows[0].own_brand).toBe(true);
  });

  it("não-admin não aprova", async () => {
    await asUser(db, bob, () => db.query("select public.request_reseller($1)", ["Também quero revender a extensão agora."]));
    const req = await db.query<{ id: string }>("select id from public.reseller_requests where user_id = $1", [bob]);
    await asUser(db, alice, async () => {
      await expect(db.query("select public.review_reseller_request($1, true, '{}'::jsonb)", [req.rows[0].id])).rejects.toThrow(/forbidden/);
    });
  });
});

describe("licença reservada por e-mail", () => {
  it("revendedor cria para um e-mail; no cadastro a licença passa para o cliente", async () => {
    const lic = await asUser(db, alice, () =>
      db.query<{ id: string; reserved_email: string }>(
        "select id, reserved_email from public.create_reserved_license($1, $2, $3)",
        ["novo@t.com", "pro", 30],
      ),
    );
    expect(lic.rows[0].reserved_email).toBe("novo@t.com");

    const newbie = await createUser(db, "novo@t.com", { full_name: "Novo Cliente" });
    const claimed = await db.query<{ owner_id: string; reserved_email: string | null; reseller_id: string }>(
      "select owner_id, reserved_email, reseller_id from public.licenses where id = $1",
      [lic.rows[0].id],
    );
    expect(claimed.rows[0].owner_id).toBe(newbie);
    expect(claimed.rows[0].reserved_email).toBeNull();
    expect(claimed.rows[0].reseller_id).toBe(alice);
  });

  it("cliente comum não reserva licença", async () => {
    await asUser(db, bob, async () => {
      await expect(db.query("select public.create_reserved_license($1, $2, $3)", ["x@t.com", "starter", 30])).rejects.toThrow(/forbidden/);
    });
  });
});

describe("versão da extensão", () => {
  it("só a publicada fica disponível para quem tem licença", async () => {
    const draft = await asUser(db, admin, () =>
      db.query<{ id: string }>("select id from public.save_extension_version($1, $2, $3, $4, $5, $6, $7)", [
        null,
        "1.0.0",
        "Lançamento",
        "Primeira versão da extensão.",
        false,
        "releases/1.0.0.zip",
        "lovable-up-extension-v1.0.0.zip",
      ]),
    );
    const latest = await asUser(db, alice, () => db.query<{ id: string }>("select id from public.latest_published_version()"));
    expect(latest.rows).toHaveLength(0);

    await asUser(db, admin, () => db.query("select public.publish_extension_version($1)", [draft.rows[0].id]));
    const pub = await asUser(db, alice, () => db.query<{ version: string }>("select version from public.latest_published_version()"));
    expect(pub.rows[0].version).toBe("1.0.0");
  });

  it("sem licença ativa o download é recusado", async () => {
    await db.query("update public.licenses set status = 'revogada' where owner_id = $1", [bob]);
    await asUser(db, bob, async () => {
      await expect(db.query("select public.request_extension_download()")).rejects.toThrow(/license_required/);
    });
  });
});
