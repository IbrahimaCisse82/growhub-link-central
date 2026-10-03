// Extracts bank statement lines from a PDF or image using Lovable AI Gateway.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { requireIdentity, requireRole, authError, jsonResponse } from "../_shared/auth.ts";

const Body = z.object({
  fileBase64: z.string().min(10).max(14_000_000),
  mimeType: z.enum(["application/pdf", "image/png", "image/jpeg", "image/webp"]),
});

const tool = {
  type: "function",
  function: {
    name: "save_statement",
    description: "Enregistre les lignes du relevé bancaire",
    parameters: {
      type: "object",
      properties: {
        bank_name: { type: "string" },
        account_number: { type: "string" },
        period_start: { type: "string", description: "YYYY-MM-DD" },
        period_end: { type: "string", description: "YYYY-MM-DD" },
        opening_balance: { type: "number" },
        closing_balance: { type: "number" },
        total_debit: { type: "number" },
        total_credit: { type: "number" },
        lines: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string", description: "Date d'opération YYYY-MM-DD (année déduite de la période)" },
              label: { type: "string" },
              reference: { type: "string", description: "N° de chèque ou de pièce si présent, sinon vide" },
              debit: { type: "number", description: "Montant au débit, 0 sinon" },
              credit: { type: "number", description: "Montant au crédit, 0 sinon" },
            },
            required: ["date", "label", "debit", "credit"],
            additionalProperties: false,
          },
        },
      },
      required: ["lines"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const identity = await requireIdentity(req);
    requireRole(identity, ["super_admin", "coordinator"]);
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return jsonResponse({ error: "Fichier invalide (PDF, PNG, JPEG ou WEBP)" }, 400, corsHeaders);
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return jsonResponse({ error: "Configuration serveur indisponible" }, 500, corsHeaders);

    const { fileBase64, mimeType } = parsed.data;
    const dataUrl = `data:${mimeType};base64,${fileBase64}`;
    const content = mimeType === "application/pdf"
      ? [{ type: "file", file: { filename: "releve.pdf", file_data: dataUrl } }]
      : [{ type: "image_url", image_url: { url: dataUrl } }];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Tu extrais fidèlement les relevés bancaires d'Afrique de l'Ouest (FCFA). Les points sont des séparateurs de milliers (1.000.000 = un million). Recopie chaque ligne de mouvement, sans inventer ni regrouper. Ignore les lignes de solde et de totaux dans la liste des lignes, mais renseigne-les dans les champs dédiés." },
          { role: "user", content: [{ type: "text", text: "Extrais toutes les lignes de ce relevé." }, ...content] },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "save_statement" } },
      }),
    });
    if (res.status === 429) return jsonResponse({ error: "Trop de demandes, réessayez dans un instant" }, 429, corsHeaders);
    if (res.status === 402) return jsonResponse({ error: "Crédits IA épuisés" }, 402, corsHeaders);
    if (!res.ok) return jsonResponse({ error: "Lecture du relevé impossible" }, 502, corsHeaders);
    const json = await res.json();
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return jsonResponse({ error: "Aucune ligne reconnue" }, 422, corsHeaders);
    return jsonResponse(JSON.parse(args), 200, corsHeaders);
  } catch (e) {
    return authError(e, corsHeaders) ?? jsonResponse({ error: "Erreur interne" }, 500, corsHeaders);
  }
});
