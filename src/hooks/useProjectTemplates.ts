import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useProjectTemplates() {
  return useQuery({
    queryKey: ["project_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_templates")
        .select("*")
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useProjectTemplate(templateId: string | null) {
  return useQuery({
    queryKey: ["project_template", templateId],
    enabled: !!templateId,
    queryFn: async () => {
      const [tpl, sections, lines, details, assumptions] = await Promise.all([
        supabase.from("project_templates").select("*").eq("id", templateId!).single(),
        supabase.from("project_template_sections").select("*").eq("template_id", templateId!).order("sort_order"),
        supabase.from("project_template_budget_lines").select("*").eq("template_id", templateId!).order("sort_order"),
        supabase.from("project_template_budget_details").select("*").eq("template_id", templateId!).order("sort_order"),
        supabase.from("project_template_assumptions").select("*").eq("template_id", templateId!).order("sort_order"),
      ]);
      if (tpl.error) throw tpl.error;
      return {
        template: tpl.data,
        sections: sections.data ?? [],
        budgetLines: lines.data ?? [],
        budgetDetails: details.data ?? [],
        assumptions: assumptions.data ?? [],
      };
    },
  });
}

export function useDefaultTemplate() {
  return useQuery({
    queryKey: ["project_template_default"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_templates")
        .select("*")
        .eq("is_default", true)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
