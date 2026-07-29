// Edge Function: gera token de acesso temporário (CPF + data nascimento).
// Token contém claim com jovem_id para consumo nas funções públicas.
// Não revela se o CPF existe; sempre retorna erro genérico em caso de falha.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT } from "npm:jose@5.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INVALID_ACCESS_ERROR = "Dados inválidos. Verifique CPF e data de nascimento.";
const RATE_LIMIT_ERROR = "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
const CPF_IP_LIMIT = {
  maxAttempts: 8,
  windowMs: 15 * 60 * 1000,
  blockMs: 15 * 60 * 1000,
} as const;
const IP_LIMIT = {
  maxAttempts: 40,
  windowMs: 60 * 60 * 1000,
  blockMs: 30 * 60 * 1000,
} as const;

type CpfRecord = {
  cpf?: string | null;
};

type PublicJovem = CpfRecord & {
  id: string;
  nome_completo: string | null;
  data_nascimento: string | null;
  email: string | null;
  celular: string | null;
  status: string | null;
};

type PublicInscricao = CpfRecord & {
  id: string;
  jovem_id: string | null;
  nome_completo: string | null;
  data_nascimento: string | null;
  email: string | null;
  contato_1: string | null;
  status: string | null;
};

type RateLimitScope = "ip" | "cpf_ip";
type RateLimitKey = {
  scope: RateLimitScope;
  keyHash: string;
  maxAttempts: number;
  windowMs: number;
  blockMs: number;
};
type AttemptRow = {
  attempts: number;
  first_attempt_at: string;
  blocked_until: string | null;
};

function normalizeCpf(cpf: string | null | undefined): string {
  return String(cpf ?? "").replace(/\D/g, "");
}

function formatCpf(cpf: string): string {
  const normalized = normalizeCpf(cpf);
  if (normalized.length !== 11) return normalized;
  return `${normalized.slice(0, 3)}.${normalized.slice(3, 6)}.${normalized.slice(6, 9)}-${normalized.slice(9)}`;
}

function buildCpfCandidates(cpf: string): string[] {
  return Array.from(new Set([normalizeCpf(cpf), formatCpf(cpf)]));
}

function matchesCpf(record: CpfRecord, normalizedCpf: string): boolean {
  return normalizeCpf(record.cpf) === normalizedCpf;
}

async function findByCpfAndBirthDate<T extends CpfRecord>(
  supabase: ReturnType<typeof createClient>,
  table: "jovens" | "inscricoes_jovens_aprendizes",
  select: string,
  normalizedCpf: string,
  birthDate: string,
): Promise<{ data: T | null; error: unknown | null }> {
  const { data: exactData, error: exactError } = await supabase
    .from(table)
    .select(select)
    .in("cpf", buildCpfCandidates(normalizedCpf))
    .eq("data_nascimento", birthDate)
    .limit(5);

  if (exactError) return { data: null, error: exactError };

  const exactMatch = ((exactData ?? []) as T[]).find((record) => matchesCpf(record, normalizedCpf));
  if (exactMatch) return { data: exactMatch, error: null };

  const { data: sameBirthDateData, error: sameBirthDateError } = await supabase
    .from(table)
    .select(select)
    .eq("data_nascimento", birthDate)
    .limit(1000);

  if (sameBirthDateError) return { data: null, error: sameBirthDateError };

  const normalizedMatch = ((sameBirthDateData ?? []) as T[]).find((record) => matchesCpf(record, normalizedCpf));
  return { data: normalizedMatch ?? null, error: null };
}

async function findJovemByCpf(
  supabase: ReturnType<typeof createClient>,
  normalizedCpf: string,
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("jovens")
    .select("id, cpf")
    .in("cpf", buildCpfCandidates(normalizedCpf))
    .limit(5);

  if (error) return null;

  return ((data ?? []) as Array<{ id: string; cpf: string | null }>).find((record) =>
    matchesCpf(record, normalizedCpf),
  ) ?? null;
}

function mapInscricaoStatusToJovemStatus(status: string | null): string {
  switch (status) {
    case "draft":
    case "completed":
    case "under_analysis":
    case "approved":
    case "active_apprentice":
      return status;
    case "talent_bank":
      return "under_analysis";
    default:
      return "under_analysis";
  }
}

function json(body: Record<string, unknown>, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      ...extraHeaders,
      "Content-Type": "application/json",
    },
  });
}

function invalidAccess(status = 401) {
  return json({ success: false, error: INVALID_ACCESS_ERROR }, status);
}

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for") || "";
  const firstForwardedIp = forwardedFor.split(",")[0]?.trim();
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    firstForwardedIp ||
    "unknown"
  );
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function buildRateLimitKeys(
  req: Request,
  normalizedCpf: string,
  secret: string,
): Promise<RateLimitKey[]> {
  const ip = getClientIp(req);
  const ipHash = await sha256Hex(`public-access:ip:${secret}:${ip}`);
  const cpfIpHash = await sha256Hex(`public-access:cpf-ip:${secret}:${normalizedCpf}:${ip}`);

  return [
    { scope: "cpf_ip", keyHash: cpfIpHash, ...CPF_IP_LIMIT },
    { scope: "ip", keyHash: ipHash, ...IP_LIMIT },
  ];
}

async function isRateLimited(
  supabase: ReturnType<typeof createClient>,
  keys: RateLimitKey[],
): Promise<boolean> {
  const nowMs = Date.now();

  for (const key of keys) {
    const { data, error } = await supabase
      .from("public_access_attempts")
      .select("blocked_until")
      .eq("scope", key.scope)
      .eq("key_hash", key.keyHash)
      .maybeSingle();

    if (error) {
      console.warn("public_access_attempts rate check failed:", error.message);
      continue;
    }

    if (data?.blocked_until && Date.parse(data.blocked_until) > nowMs) {
      return true;
    }
  }

  return false;
}

async function recordFailedAttempt(
  supabase: ReturnType<typeof createClient>,
  keys: RateLimitKey[],
) {
  const now = new Date();
  const nowIso = now.toISOString();
  const nowMs = now.getTime();

  for (const key of keys) {
    const { data, error } = await supabase
      .from("public_access_attempts")
      .select("attempts, first_attempt_at, blocked_until")
      .eq("scope", key.scope)
      .eq("key_hash", key.keyHash)
      .maybeSingle();

    if (error) {
      console.warn("public_access_attempts read failed:", error.message);
      continue;
    }

    const row = data as AttemptRow | null;
    const firstAttemptMs = row?.first_attempt_at ? Date.parse(row.first_attempt_at) : 0;
    const insideWindow = Boolean(row && firstAttemptMs + key.windowMs > nowMs);
    const attempts = insideWindow ? row.attempts + 1 : 1;
    const firstAttemptAt = insideWindow ? row.first_attempt_at : nowIso;
    const blockedUntil =
      attempts >= key.maxAttempts
        ? new Date(nowMs + key.blockMs).toISOString()
        : row?.blocked_until && Date.parse(row.blocked_until) > nowMs
          ? row.blocked_until
          : null;

    const { error: upsertError } = await supabase
      .from("public_access_attempts")
      .upsert(
        {
          scope: key.scope,
          key_hash: key.keyHash,
          attempts,
          first_attempt_at: firstAttemptAt,
          last_attempt_at: nowIso,
          blocked_until: blockedUntil,
          updated_at: nowIso,
        },
        { onConflict: "scope,key_hash" },
      );

    if (upsertError) {
      console.warn("public_access_attempts upsert failed:", upsertError.message);
    }
  }
}

async function clearFailedAttempts(
  supabase: ReturnType<typeof createClient>,
  keys: RateLimitKey[],
) {
  for (const key of keys) {
    const { error } = await supabase
      .from("public_access_attempts")
      .delete()
      .eq("scope", key.scope)
      .eq("key_hash", key.keyHash);

    if (error) {
      console.warn("public_access_attempts cleanup failed:", error.message);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "POST") {
    return json({ success: false, error: "Método não permitido." }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const cpf = typeof body.cpf === "string" ? body.cpf.trim() : "";
    const birthDate = body.birth_date ?? body.data_nascimento ?? "";

    if (!cpf || !birthDate) {
      return json({ success: false, error: "Dados inválidos." }, 400);
    }

    const parsedDate = new Date(String(birthDate));
    if (isNaN(parsedDate.getTime())) {
      return json({ success: false, error: "Dados inválidos." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET") ?? Deno.env.get("JWT_SECRET");
    if (!jwtSecret) {
      return json({ success: false, error: "Dados inválidos." }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const normalizedCpf = normalizeCpf(cpf);
    const normalizedBirthDate = String(birthDate).slice(0, 10);
    const rateLimitSecret =
      Deno.env.get("PUBLIC_ACCESS_RATE_LIMIT_SECRET") ?? jwtSecret ?? supabaseServiceKey;
    const rateLimitKeys = await buildRateLimitKeys(req, normalizedCpf || "invalid", rateLimitSecret);

    if (await isRateLimited(supabase, rateLimitKeys)) {
      return json(
        { success: false, error: RATE_LIMIT_ERROR },
        429,
        { "Retry-After": String(Math.ceil(CPF_IP_LIMIT.blockMs / 1000)) },
      );
    }

    if (normalizedCpf.length !== 11) {
      await recordFailedAttempt(supabase, rateLimitKeys);
      return json({ success: false, error: "Dados inválidos." }, 400);
    }

    const { data: jovem, error: jovemError } = await findByCpfAndBirthDate<PublicJovem>(
      supabase,
      "jovens",
      "id, cpf, nome_completo, data_nascimento, email, celular, status",
      normalizedCpf,
      normalizedBirthDate,
    );
    let inscricaoId: string | null = null;

    if (jovemError) {
      return invalidAccess();
    }

    // Fallback: permite acesso para quem ainda está na inscrição/banco de talentos.
    if (!jovem) {
      const { data: inscricao, error: inscricaoError } = await findByCpfAndBirthDate<PublicInscricao>(
        supabase,
        "inscricoes_jovens_aprendizes",
        "id, jovem_id, cpf, nome_completo, data_nascimento, email, contato_1, status",
        normalizedCpf,
        normalizedBirthDate,
      );

      if (inscricaoError || !inscricao) {
        await recordFailedAttempt(supabase, rateLimitKeys);
        return invalidAccess();
      }

      inscricaoId = inscricao.id;
      let jovemId = inscricao.jovem_id as string | null;
      if (!jovemId) {
        const youngByCpf = await findJovemByCpf(supabase, normalizedCpf);

        if (youngByCpf?.id) {
          jovemId = youngByCpf.id;
        }
      }

      if (jovemId) {
        const { data: jovemFromInscricao, error: jovemFromInscricaoError } = await supabase
          .from("jovens")
          .select("id, nome_completo, data_nascimento, email, celular, status")
          .eq("id", jovemId)
          .maybeSingle();

        if (jovemFromInscricaoError || !jovemFromInscricao) {
          return invalidAccess();
        }

        jovem = jovemFromInscricao;
      } else {
        jovem = {
          id: inscricao.id,
          nome_completo: inscricao.nome_completo,
          data_nascimento: inscricao.data_nascimento,
          email: inscricao.email,
          celular: inscricao.contato_1,
          status: mapInscricaoStatusToJovemStatus(inscricao.status),
        };
      }
    }

    await clearFailedAttempts(supabase, rateLimitKeys);

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 20 * 60;
    const secret = new TextEncoder().encode(jwtSecret);
    const jwt = await new SignJWT({
      role: "anon",
      public_access: true,
      jovem_id: jovem.id,
      inscricao_id: inscricaoId,
      })
      .setSubject(`public-access:${jovem.id}`)
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .sign(secret);
    return json(
      {
        success: true,
        access_token: jwt,
        expires_in: 20 * 60,
        jovem: {
          id: jovem.id,
          nome_completo: jovem.nome_completo,
          data_nascimento: jovem.data_nascimento,
          email: jovem.email,
          celular: jovem.celular,
          status: jovem.status,
        },
      },
      200,
    );
  } catch {
    return invalidAccess();
  }
});
