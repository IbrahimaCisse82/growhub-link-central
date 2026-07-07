import { describe, it, expect } from "vitest";
import { buildWorkPackages } from "../workPackageUtils";

describe("buildWorkPackages", () => {
  it("retourne [] si logFrame null", () => {
    expect(buildWorkPackages(null, [], [])).toEqual([]);
  });

  it("retourne [] si aucun objectif spécifique", () => {
    expect(buildWorkPackages({ specific_objectives: [] }, [], [])).toEqual([]);
  });

  it("découpe le titre sur ':' quand présent", () => {
    const wps = buildWorkPackages(
      { specific_objectives: ["Renforcement RH : améliorer les compétences internes"] },
      [],
      []
    );
    expect(wps).toHaveLength(1);
    expect(wps[0].title).toBe("Renforcement RH");
    expect(wps[0].objective).toBe("améliorer les compétences internes");
  });

  it("distribue activités par préfixe A1.x → WP1", () => {
    const wps = buildWorkPackages(
      { specific_objectives: ["Obj 1", "Obj 2"], activities: ["A1.1 Formation", "A2.1 Suivi", "A1.2 Coaching"] },
      [],
      []
    );
    expect(wps[0].activities).toEqual(["Formation", "Coaching"]);
    expect(wps[1].activities).toEqual(["Suivi"]);
  });

  it("distribue par chunks quand aucun préfixe", () => {
    const wps = buildWorkPackages(
      { specific_objectives: ["Obj 1", "Obj 2"], activities: ["a", "b", "c", "d"] },
      [],
      []
    );
    expect(wps[0].activities.length + wps[1].activities.length).toBe(4);
  });

  it("mappe indicateurs par préfixe I1.x", () => {
    const wps = buildWorkPackages(
      { specific_objectives: ["Obj1", "Obj2"] },
      [
        { name: "I1.1 Formés", current_value: 10, target_value: 100, unit: "pers" },
        { name: "I2.1 Emplois", current_value: 5, target_value: 50, unit: "job" },
      ],
      []
    );
    expect(wps[0].indicators).toEqual([{ name: "Formés", current: 10, target: 100, unit: "pers" }]);
    expect(wps[1].indicators[0].name).toBe("Emplois");
  });

  it("mappe jalons par préfixe M1.x avec status par défaut", () => {
    const wps = buildWorkPackages(
      { specific_objectives: ["Obj1"] },
      [],
      [{ title: "M1.1 Kick-off", status: null, due_date: "2026-01-15" }]
    );
    expect(wps[0].milestones).toEqual([{ title: "Kick-off", status: "pending", dueDate: "2026-01-15" }]);
  });
});
