import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authError, jsonResponse, requireIdentity } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    await requireIdentity(req);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const input = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!input) return jsonResponse({ error: "Requête invalide" }, 400, corsHeaders);
    const { action, messages, topic, level, modules_count } = input;
    if (action !== "generate_course" && action !== "chat") return jsonResponse({ error: "Action inconnue" }, 400, corsHeaders);
    if (action === "generate_course" && (typeof topic !== "string" || !topic.trim() || topic.length > 300 || (level !== undefined && !["beginner", "intermediate", "advanced"].includes(String(level))) || (modules_count !== undefined && (!Number.isInteger(modules_count) || Number(modules_count) < 1 || Number(modules_count) > 12)))) return jsonResponse({ error: "Paramètres du cours invalides" }, 400, corsHeaders);
    if (action === "chat" && (!Array.isArray(messages) || messages.length > 30 || messages.some((message) => typeof message !== "object" || message === null || !["user", "assistant"].includes(String((message as Record<string, unknown>).role)) || typeof (message as Record<string, unknown>).content !== "string" || String((message as Record<string, unknown>).content).length > 10000))) return jsonResponse({ error: "Messages invalides" }, 400, corsHeaders);

    let aiMessages: Array<{ role: string; content: string }> = [];

    if (action === "generate_course") {
      aiMessages = [
        {
          role: "system",
          content: `Tu es un expert en ingénierie pédagogique et e-learning pour les incubateurs et accélérateurs d'entreprises en Afrique. 
Tu crées des contenus de formation structurés, pratiques et adaptés aux entrepreneurs.

Quand on te demande de générer un cours, tu dois retourner un JSON valide avec cette structure exacte:
{
  "title": "Titre du cours",
  "description": "Description courte",
  "level": "beginner|intermediate|advanced",
  "duration_hours": number,
  "modules": [
    {
      "title": "Titre du module",
      "content": "Contenu détaillé du module en markdown (minimum 500 mots avec exemples concrets, études de cas africaines, exercices pratiques)",
      "duration_minutes": number,
      "module_type": "lesson|exercise|quiz|case_study",
      "quiz_questions": [
        {
          "question": "Question ?",
          "options": ["A", "B", "C", "D"],
          "correct": 0,
          "explanation": "Explication"
        }
      ]
    }
  ]
}

IMPORTANT: Retourne UNIQUEMENT le JSON, sans texte avant ou après. Chaque module doit contenir un contenu pédagogique riche et détaillé.`
        },
        {
          role: "user",
          content: `Génère un cours complet sur le thème "${topic}" pour le niveau "${level || 'beginner'}". Le cours doit comporter ${modules_count || 5} modules. Inclus des quiz pour chaque module de type leçon.`
        }
      ];
    } else if (action === "chat") {
      const chatMessages = messages as Array<{ role: string; content: string }>;
      aiMessages = [
        {
          role: "system",
          content: `Tu es un assistant pédagogique expert en e-learning pour les incubateurs d'entreprises. Tu aides à:
- Structurer et améliorer des contenus de formation
- Rédiger des modules, quiz et exercices
- Adapter le contenu au contexte entrepreneurial africain
- Suggérer des améliorations pédagogiques
Sois concis, pratique et bienveillant. Utilise le markdown pour formater tes réponses.`
        },
        ...chatMessages
      ];
    } else {
      return new Response(JSON.stringify({ error: "Action inconnue" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate_course") {
      // Non-streaming for course generation (need complete JSON)
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: aiMessages,
          stream: false,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, réessayez dans quelques instants." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Crédits insuffisants. Ajoutez des crédits dans les paramètres." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        console.error("AI error:", response.status, t);
        throw new Error("AI gateway error");
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content ?? "";
      
      // Extract JSON from response
      let courseData;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        courseData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
      } catch {
        console.error("Failed to parse AI response:", content);
        return new Response(JSON.stringify({ error: "Erreur de parsing du cours généré. Réessayez." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(courseData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      // Streaming for chat
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: aiMessages,
          stream: true,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Limite de requêtes atteinte." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Crédits insuffisants." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        console.error("AI error:", response.status, t);
        throw new Error("AI gateway error");
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }
  } catch (e) {
    console.error("elearning-ai error:", e);
    const response = authError(e, corsHeaders);
    return response ?? jsonResponse({ error: "Service indisponible" }, 500, corsHeaders);
  }
});
