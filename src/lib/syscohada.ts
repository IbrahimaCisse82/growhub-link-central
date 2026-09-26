/** Règles SYSCOHADA révisé : sens normal des comptes et modèles officiels des états financiers. */

export type Side = "debit" | "credit" | "mixte";

/** Sens normal du solde d'un compte selon le plan SYSCOHADA révisé. */
export function normalSide(code: string): Side {
  if (!code) return "mixte";
  if (/^(28|29|39|49|59)/.test(code)) return "credit"; // amortissements & dépréciations
  if (/^(603|73|109|12|13|47|48)/.test(code)) return "mixte";
  if (/^(409|4[2-4]9)/.test(code)) return "debit";
  if (/^419/.test(code)) return "credit";
  if (/^(40|42|43)/.test(code)) return "credit";
  if (/^41/.test(code)) return "debit";
  const c = code[0];
  if (c === "1" || c === "7") return "credit";
  if (c === "2" || c === "3" || c === "6") return "debit";
  if (/^(81|83|85|87|89)/.test(code)) return "debit";
  if (/^(82|84|86|88)/.test(code)) return "credit";
  if (/^(57|50|51)/.test(code)) return "debit";
  return "mixte";
}

export const sideLabel: Record<Side, string> = { debit: "Débiteur", credit: "Créditeur", mixte: "Débiteur ou créditeur" };

/** Comptes lettrables : tiers (classe 4) et virements internes. */
export const isLetterable = (code: string) => /^(4|58)/.test(code);

export interface BalLine { code: string; solde: number } // solde = débit − crédit

export const sumPrefix = (rows: BalLine[], prefixes: string[], exclude: string[] = []) =>
  rows.filter((r) => prefixes.some((p) => r.code.startsWith(p)) && !exclude.some((p) => r.code.startsWith(p)))
    .reduce((s, r) => s + r.solde, 0);

const debitorOnly = (rows: BalLine[], prefixes: string[], exclude: string[] = []) =>
  rows.filter((r) => prefixes.some((p) => r.code.startsWith(p)) && !exclude.some((p) => r.code.startsWith(p)) && r.solde > 0)
    .reduce((s, r) => s + r.solde, 0);
const creditorOnly = (rows: BalLine[], prefixes: string[], exclude: string[] = []) =>
  rows.filter((r) => prefixes.some((p) => r.code.startsWith(p)) && !exclude.some((p) => r.code.startsWith(p)) && r.solde < 0)
    .reduce((s, r) => s - r.solde, 0);

export interface StatementLine { ref: string; label: string; brut?: number; amort?: number; value: number; total?: boolean }

/** Actif du bilan SYSCOHADA révisé (brut, amortissements/dépréciations, net). */
export function bilanActif(r: BalLine[]): StatementLine[] {
  const L = (ref: string, label: string, brut: number, amort: number): StatementLine => ({ ref, label, brut, amort, value: brut - amort });
  const ad = L("AD", "Immobilisations incorporelles", sumPrefix(r, ["21", "20"]), -sumPrefix(r, ["281", "280", "291", "290"]));
  const ai = L("AI", "Immobilisations corporelles", sumPrefix(r, ["22", "23", "24"]), -sumPrefix(r, ["282", "283", "284", "292", "293", "294"]));
  const ap = L("AP", "Avances et acomptes versés sur immobilisations", sumPrefix(r, ["25"]), -sumPrefix(r, ["295"]));
  const aq = L("AQ", "Immobilisations financières", sumPrefix(r, ["26", "27"]), -sumPrefix(r, ["296", "297"]));
  const az: StatementLine = { ref: "AZ", label: "TOTAL ACTIF IMMOBILISÉ", brut: [ad, ai, ap, aq].reduce((s, x) => s + (x.brut ?? 0), 0), amort: [ad, ai, ap, aq].reduce((s, x) => s + (x.amort ?? 0), 0), value: ad.value + ai.value + ap.value + aq.value, total: true };
  const ba = L("BA", "Actif circulant HAO", debitorOnly(r, ["481", "482", "484", "485", "488"]), -sumPrefix(r, ["498"]));
  const bb = L("BB", "Stocks et encours", sumPrefix(r, ["3"], ["39"]), -sumPrefix(r, ["39"]));
  const bh = L("BH", "Fournisseurs, avances versées", debitorOnly(r, ["40"]), -sumPrefix(r, ["490"]));
  const bi = L("BI", "Clients", debitorOnly(r, ["41"]), -sumPrefix(r, ["491"]));
  const bj = L("BJ", "Autres créances", debitorOnly(r, ["42", "43", "44", "45", "46", "47"], ["478"]), -sumPrefix(r, ["492", "493", "494", "495", "496", "497"]));
  const bk = [ba, bb, bh, bi, bj];
  const bt: StatementLine = { ref: "BK", label: "TOTAL ACTIF CIRCULANT", brut: bk.reduce((s, x) => s + (x.brut ?? 0), 0), amort: bk.reduce((s, x) => s + (x.amort ?? 0), 0), value: bk.reduce((s, x) => s + x.value, 0), total: true };
  const bq = L("BQ", "Titres de placement", sumPrefix(r, ["50"]), -sumPrefix(r, ["590"]));
  const br = L("BR", "Valeurs à encaisser", debitorOnly(r, ["51"]) + debitorOnly(r, ["56"]), 0);
  const bs = L("BS", "Banques, chèques postaux, caisse et assimilés", debitorOnly(r, ["52", "53", "54", "55", "57", "58"]), -sumPrefix(r, ["591", "592", "593", "594"]));
  const btt: StatementLine = { ref: "BT", label: "TOTAL TRÉSORERIE-ACTIF", value: bq.value + br.value + bs.value, total: true };
  const bu = L("BU", "Écart de conversion-Actif", debitorOnly(r, ["478"]), 0);
  const bz: StatementLine = { ref: "BZ", label: "TOTAL GÉNÉRAL ACTIF", value: az.value + bt.value + btt.value + bu.value, total: true };
  return [ad, ai, ap, aq, az, ba, bb, bh, bi, bj, bt, bq, br, bs, btt, bu, bz];
}

/** Passif du bilan SYSCOHADA révisé. `resultat` = résultat net de l'exercice en cours. */
export function bilanPassif(r: BalLine[], resultat: number): StatementLine[] {
  const L = (ref: string, label: string, value: number, total = false): StatementLine => ({ ref, label, value, total });
  const ca = L("CA", "Capital", -sumPrefix(r, ["101", "102", "103", "104"]));
  const cb = L("CB", "Apporteurs capital non appelé (−)", -sumPrefix(r, ["109"]));
  const cd = L("CD", "Primes liées au capital social", -sumPrefix(r, ["105"]));
  const ce = L("CE", "Écarts de réévaluation", -sumPrefix(r, ["106"]));
  const cf = L("CF", "Réserves", -sumPrefix(r, ["11"]));
  const cg = L("CG", "Report à nouveau (+ ou −)", -sumPrefix(r, ["12"]));
  const ch = L("CH", "Résultat net de l'exercice", -sumPrefix(r, ["13"]) + resultat);
  const cl = L("CL", "Subventions d'investissement", -sumPrefix(r, ["14"]));
  const cm = L("CM", "Provisions réglementées", -sumPrefix(r, ["15"]));
  const cp = [ca, cb, cd, ce, cf, cg, ch, cl, cm];
  const cpT = L("CP", "TOTAL CAPITAUX PROPRES ET RESSOURCES ASSIMILÉES", cp.reduce((s, x) => s + x.value, 0), true);
  const da = L("DA", "Emprunts et dettes financières diverses", -sumPrefix(r, ["16", "18"]));
  const db = L("DB", "Dettes de location acquisition", -sumPrefix(r, ["17"]));
  const dc = L("DC", "Provisions pour risques et charges", -sumPrefix(r, ["19"]));
  const dd = L("DD", "TOTAL DETTES FINANCIÈRES", da.value + db.value + dc.value, true);
  const df = L("DF", "TOTAL RESSOURCES STABLES", cpT.value + dd.value, true);
  const dh = L("DH", "Dettes circulantes HAO", creditorOnly(r, ["481", "482", "484", "485", "488"]));
  const di = L("DI", "Clients, avances reçues", creditorOnly(r, ["41"]));
  const dj = L("DJ", "Fournisseurs d'exploitation", creditorOnly(r, ["40"]));
  const dk = L("DK", "Dettes fiscales et sociales", creditorOnly(r, ["42", "43", "44"]));
  const dm = L("DM", "Autres dettes", creditorOnly(r, ["45", "46", "47"], ["479"]));
  const dn = L("DN", "Provisions pour risques à court terme", -sumPrefix(r, ["499"]));
  const dp = L("DP", "TOTAL PASSIF CIRCULANT", [dh, di, dj, dk, dm, dn].reduce((s, x) => s + x.value, 0), true);
  const dq = L("DQ", "Banques, crédits d'escompte", creditorOnly(r, ["56"]));
  const dr = L("DR", "Banques, établissements financiers et crédits de trésorerie", creditorOnly(r, ["51", "52", "53", "54", "55", "57", "58"]) - sumPrefix(r, ["599"]));
  const dt = L("DT", "TOTAL TRÉSORERIE-PASSIF", dq.value + dr.value, true);
  const dv = L("DV", "Écart de conversion-Passif", creditorOnly(r, ["479"]));
  const dz = L("DZ", "TOTAL GÉNÉRAL PASSIF", df.value + dp.value + dt.value + dv.value, true);
  return [...cp, cpT, da, db, dc, dd, df, dh, di, dj, dk, dm, dn, dp, dq, dr, dt, dv, dz];
}

/** Compte de résultat SYSCOHADA révisé avec soldes intermédiaires de gestion. */
export function compteResultat(r: BalLine[]): StatementLine[] {
  const P = (p: string[], ex: string[] = []) => -sumPrefix(r, p, ex); // produits (créditeurs)
  const C = (p: string[], ex: string[] = []) => sumPrefix(r, p, ex); // charges (débitrices)
  const L = (ref: string, label: string, value: number, total = false): StatementLine => ({ ref, label, value, total });
  const ta = L("TA", "Ventes de marchandises", P(["701"]));
  const ra = L("RA", "Achats de marchandises", -C(["601"]));
  const rb = L("RB", "Variation de stocks de marchandises", -C(["6031"]));
  const xa = L("XA", "MARGE COMMERCIALE", ta.value + ra.value + rb.value, true);
  const tb = L("TB", "Ventes de produits fabriqués", P(["702", "703", "704"]));
  const tc = L("TC", "Travaux, services vendus", P(["705", "706"]));
  const td = L("TD", "Produits accessoires", P(["707"]));
  const xb = L("XB", "CHIFFRE D'AFFAIRES", ta.value + tb.value + tc.value + td.value, true);
  const te = L("TE", "Production stockée (ou déstockage)", P(["73"]));
  const tf = L("TF", "Production immobilisée", P(["72"]));
  const tg = L("TG", "Subventions d'exploitation", P(["71"]));
  const th = L("TH", "Autres produits", P(["75"]));
  const ti = L("TI", "Transferts de charges d'exploitation", P(["781"]));
  const rc = L("RC", "Achats de matières premières et fournitures liées", -C(["602"]));
  const rd = L("RD", "Variation de stocks de matières premières", -C(["6032"]));
  const re = L("RE", "Autres achats", -C(["604", "605", "608"]));
  const rf = L("RF", "Variation de stocks d'autres approvisionnements", -C(["6033"]));
  const rg = L("RG", "Transports", -C(["61"]));
  const rh = L("RH", "Services extérieurs", -C(["62", "63"]));
  const ri = L("RI", "Impôts et taxes", -C(["64"]));
  const rj = L("RJ", "Autres charges", -C(["65"]));
  const xc = L("XC", "VALEUR AJOUTÉE", xa.value + tb.value + tc.value + td.value + te.value + tf.value + tg.value + th.value + ti.value
    + rc.value + rd.value + re.value + rf.value + rg.value + rh.value + ri.value + rj.value, true);
  const rk = L("RK", "Charges de personnel", -C(["66"]));
  const xd = L("XD", "EXCÉDENT BRUT D'EXPLOITATION", xc.value + rk.value, true);
  const tj = L("TJ", "Reprises d'amortissements, provisions et dépréciations", P(["791", "798", "799"]));
  const rl = L("RL", "Dotations aux amortissements, provisions et dépréciations", -C(["681", "691"]));
  const xe = L("XE", "RÉSULTAT D'EXPLOITATION", xd.value + tj.value + rl.value, true);
  const tk = L("TK", "Revenus financiers et assimilés", P(["77"]));
  const tl = L("TL", "Reprises de provisions et dépréciations financières", P(["797"]));
  const tm = L("TM", "Transferts de charges financières", P(["787"]));
  const rm = L("RM", "Frais financiers et charges assimilées", -C(["67"]));
  const rn = L("RN", "Dotations aux provisions et dépréciations financières", -C(["697"]));
  const xf = L("XF", "RÉSULTAT FINANCIER", tk.value + tl.value + tm.value + rm.value + rn.value, true);
  const xg = L("XG", "RÉSULTAT DES ACTIVITÉS ORDINAIRES", xe.value + xf.value, true);
  const tn = L("TN", "Produits des cessions d'immobilisations", P(["82"]));
  const to = L("TO", "Autres produits HAO", P(["84", "86", "88"]));
  const ro = L("RO", "Valeurs comptables des cessions d'immobilisations", -C(["81"]));
  const rp = L("RP", "Autres charges HAO", -C(["83", "85"]));
  const xh = L("XH", "RÉSULTAT HORS ACTIVITÉS ORDINAIRES", tn.value + to.value + ro.value + rp.value, true);
  const rq = L("RQ", "Participation des travailleurs", -C(["87"]));
  const rs = L("RS", "Impôts sur le résultat", -C(["89"]));
  const xi = L("XI", "RÉSULTAT NET", xg.value + xh.value + rq.value + rs.value, true);
  return [ta, ra, rb, xa, tb, tc, td, xb, te, tf, tg, th, ti, rc, rd, re, rf, rg, rh, ri, rj, xc, rk, xd, tj, rl, xe, tk, tl, tm, rm, rn, xf, xg, tn, to, ro, rp, xh, rq, rs, xi];
}

/** Tableau des flux de trésorerie (SYSCOHADA révisé), version synthétique.
 *  `opening` = soldes d'ouverture (à-nouveaux), `closing` = soldes de clôture. */
export function fluxTresorerie(closing: BalLine[], opening: BalLine[], resultatNet: number): StatementLine[] {
  const L = (ref: string, label: string, value: number, total = false): StatementLine => ({ ref, label, value, total });
  const treso = (r: BalLine[]) => sumPrefix(r, ["50", "51", "52", "53", "54", "55", "56", "57", "58"]);
  const delta = (p: string[], ex: string[] = []) => sumPrefix(closing, p, ex) - sumPrefix(opening, p, ex);
  const za = L("ZA", "Trésorerie nette au 1er janvier", treso(opening));
  const dot = sumPrefix(closing, ["681", "691", "697"]);
  const rep = -sumPrefix(closing, ["791", "797", "798", "799"]);
  const cess = -sumPrefix(closing, ["82"]) - sumPrefix(closing, ["81"]);
  const fa = L("FA", "Capacité d'autofinancement globale (CAFG)", resultatNet + dot - rep - cess);
  const fb = L("FB", "Variation des actifs circulants HAO (−)", -delta(["485", "488"]));
  const fc = L("FC", "Variation des stocks (−)", -delta(["3"], ["39"]));
  const fd = L("FD", "Variation des créances et dettes d'exploitation (tiers)", -delta(["40", "41", "42", "43", "44", "45", "46", "47"]));
  const zb = L("ZB", "Flux de trésorerie provenant des activités opérationnelles", fa.value + fb.value + fc.value + fd.value, true);
  const ff = L("FF", "Décaissements liés aux acquisitions d'immobilisations (−)", -Math.max(0, delta(["21", "22", "23", "24", "25", "26", "27"])));
  const fj = L("FJ", "Encaissements liés aux cessions d'immobilisations", -sumPrefix(closing, ["82"]));
  const zc = L("ZC", "Flux de trésorerie provenant des activités d'investissement", ff.value + fj.value, true);
  const fk = L("FK", "Augmentations de capital et subventions reçues", -delta(["10", "14"]));
  const fo = L("FO", "Emprunts et autres dettes financières (net)", -delta(["16", "17", "18"]));
  const zd = L("ZD", "Flux de trésorerie provenant des activités de financement", fk.value + fo.value, true);
  const zg = L("ZG", "VARIATION DE LA TRÉSORERIE NETTE", treso(closing) - treso(opening), true);
  const zh = L("ZH", "Trésorerie nette au 31 décembre", treso(closing), true);
  return [za, fa, fb, fc, fd, zb, ff, fj, zc, fk, fo, zd, zg, zh];
}
