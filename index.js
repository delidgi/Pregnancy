import { extension_settings, saveSettingsDebounced } from "../../../extensions.js";

const extensionName = "reproductive-health";
const extensionFolderPath = `scripts/extensions/third-party/sillytavern-${extensionName}`;

const defaultSettings = {
    enabled: true,
    language: 'ru',
    contraception: {
        condom: false, condomEffectiveness: 85,
        pill: false, pillEffectiveness: 91, pillDaysTaken: 0,
        iud: false, iudEffectiveness: 99,
        implant: false, implantEffectiveness: 99,
        withdrawal: false, withdrawalEffectiveness: 78
    },
    fertility: {
        baseFertility: 25, cycleDay: 1, cycleLength: 28,
        ovulationWindow: [12, 16], fertilityMultiplier: 1.0
    },
    menstruation: {
        isActive: false, startDay: 1, duration: 5, intensity: 'normal',
        pmsStartDay: 25, pmsDuration: 3, isPMS: false,
        lastPeriodDate: null, symptoms: [], irregularity: 0
    },
    sti: {
        enabled: true, character_sti_status: {},
        user_sti_status: { infected: [], history: [], lastTest: null },
        transmissionRates: {
            'chlamydia': { maleToFemale: 40, femaleToMale: 32, condomReduction: 80 },
            'gonorrhea': { maleToFemale: 50, femaleToMale: 20, condomReduction: 80 },
            'syphilis': { maleToFemale: 30, femaleToMale: 30, condomReduction: 50 },
            'herpes': { maleToFemale: 10, femaleToMale: 4, condomReduction: 30 },
            'hpv': { maleToFemale: 20, femaleToMale: 20, condomReduction: 70 },
            'hiv': { maleToFemale: 0.08, femaleToMale: 0.04, condomReduction: 85 },
            'trichomoniasis': { maleToFemale: 70, femaleToMale: 70, condomReduction: 60 }
        }
    },
    pregnancy: {
        isPregnant: false, conceptionDate: null, currentWeek: 0,
        complications: [], checkups: [], outcome: null
    },
    history: { encounters: [], conceptionRolls: [], stiChecks: [], periods: [] }
};

const i18n = {
    ru: {
        conception_roll: "🤰 БРОСОК НА ЗАЧАТИЕ", roll: "Бросок", result: "Результат",
        conception_yes: "✅ ЗАЧАТИЕ ПРОИЗОШЛО", conception_no: "❌ ЗАЧАТИЕ НЕ ПРОИЗОШЛО",
        date: "Дата", status: "Статус",
        pregnancy_initiated: "Беременность началась",
        no_pregnancy_this_time: "В этот раз беременность не наступила",
        pregnancy_status: "🤰 СТАТУС БЕРЕМЕННОСТИ",
        week: "Неделя", stage: "Стадия", trimester: "Триместр",
        visible_changes: "Изменения",
        early: "Ранняя", showing: "Заметная", advanced: "Поздняя", labor: "Роды",
        complication_check: "⚠️ ПРОВЕРКА ОСЛОЖНЕНИЙ",
        severe: "ТЯЖЁЛОЕ", moderate: "УМЕРЕННОЕ", normal: "НОРМА",
        sti_check: "🔬 ПРОВЕРКА ИППП",
        infected: "ЗАРАЖЕНИЕ", safe: "Безопасно",
        condom_broke: "⚠️ ПРЕЗЕРВАТИВ ПОРВАЛСЯ",
        high_fertility: "ВЫСОКАЯ", low_fertility: "низкая", normal_fertility: "норма",
        cycle_day: "День цикла",
        period_status: "🩸 МЕНСТРУАЦИЯ", period_active: "Идут месячные",
        period_day: "День", period_intensity: "Интенсивность",
        period_light: "Скудные", period_normal: "Нормальные", period_heavy: "Обильные",
        pms_active: "ПМС", pms_symptoms: "Симптомы",
        no_period: "Нет", next_period: "До месячных",
        partner_risk: "Риск партнёра", during_period: "Во время месячных"
    },
    en: {
        conception_roll: "🤰 CONCEPTION ROLL", roll: "Roll", result: "Result",
        conception_yes: "✅ CONCEPTION OCCURRED", conception_no: "❌ NO CONCEPTION",
        date: "Date", status: "Status",
        pregnancy_initiated: "Pregnancy initiated",
        no_pregnancy_this_time: "No pregnancy this time",
        pregnancy_status: "🤰 PREGNANCY STATUS",
        week: "Week", stage: "Stage", trimester: "Trimester",
        visible_changes: "Changes",
        early: "Early", showing: "Showing", advanced: "Advanced", labor: "Labor",
        complication_check: "⚠️ COMPLICATION CHECK",
        severe: "SEVERE", moderate: "MODERATE", normal: "NORMAL",
        sti_check: "🔬 STI CHECK",
        infected: "INFECTED", safe: "Safe",
        condom_broke: "⚠️ CONDOM BROKE",
        high_fertility: "HIGH", low_fertility: "low", normal_fertility: "normal",
        cycle_day: "Cycle day",
        period_status: "🩸 MENSTRUATION", period_active: "Period active",
        period_day: "Day", period_intensity: "Intensity",
        period_light: "Light", period_normal: "Normal", period_heavy: "Heavy",
        pms_active: "PMS", pms_symptoms: "Symptoms",
        no_period: "None", next_period: "Until period",
        partner_risk: "Partner risk", during_period: "During period"
    }
};

const pmsSymptoms = {
    ru: ['раздражительность', 'перепады настроения', 'усталость', 'вздутие', 'болезненность груди', 'головная боль', 'тяга к сладкому', 'бессонница', 'тревожность', 'плаксивость', 'боль в пояснице', 'отёки'],
    en: ['irritability', 'mood swings', 'fatigue', 'bloating', 'breast tenderness', 'headache', 'cravings', 'insomnia', 'anxiety', 'tearfulness', 'back pain', 'swelling']
};

const periodSymptoms = {
    ru: { light: ['лёгкие спазмы'], normal: ['спазмы', 'усталость'], heavy: ['сильные спазмы', 'слабость', 'головокружение'] },
    en: { light: ['mild cramps'], normal: ['cramps', 'fatigue'], heavy: ['severe cramps', 'weakness', 'dizziness'] }
};

const stiDatabase = {
    chlamydia: { name: { ru: 'Хламидиоз', en: 'Chlamydia' }, curable: true },
    gonorrhea: { name: { ru: 'Гонорея', en: 'Gonorrhea' }, curable: true },
    syphilis: { name: { ru: 'Сифилис', en: 'Syphilis' }, curable: true },
    herpes: { name: { ru: 'Герпес', en: 'Herpes' }, curable: false },
    hpv: { name: { ru: 'ВПЧ', en: 'HPV' }, curable: false },
    hiv: { name: { ru: 'ВИЧ', en: 'HIV' }, curable: false },
    trichomoniasis: { name: { ru: 'Трихомониаз', en: 'Trichomoniasis' }, curable: true }
};

const visibleChanges = {
    ru: { 0: 'Нет изменений', 4: 'Тошнота, усталость', 8: 'Увеличение груди', 12: 'Округление живота', 16: 'Живот заметен', 20: 'Шевеления', 24: 'Большой живот', 28: 'Одышка', 32: 'Частые позывы', 36: 'Готовность к родам', 40: 'Полный срок' },
    en: { 0: 'No changes', 4: 'Nausea, fatigue', 8: 'Breast growth', 12: 'Belly rounding', 16: 'Belly visible', 20: 'Movements', 24: 'Large belly', 28: 'Shortness of breath', 32: 'Frequent urination', 36: 'Ready for birth', 40: 'Full term' }
};

const complications = {
    1: { severe: { ru: ['Угроза выкидыша', 'Внематочная'], en: ['Miscarriage threat', 'Ectopic'] }, moderate: { ru: ['Сильный токсикоз'], en: ['Severe nausea'] } },
    2: { severe: { ru: ['Преждевременные роды', 'Диабет'], en: ['Preterm risk', 'Diabetes'] }, moderate: { ru: ['Анемия', 'Давление'], en: ['Anemia', 'Blood pressure'] } },
    3: { severe: { ru: ['Преэклампсия', 'Отслойка'], en: ['Preeclampsia', 'Abruption'] }, moderate: { ru: ['Маловодие', 'Тазовое'], en: ['Low fluid', 'Breech'] } }
};

function trueRandom(min, max) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return min + (arr[0] % (max - min + 1));
}

function rollD100() { return trueRandom(1, 100); }

function t(key) {
    const lang = extension_settings.reproHealth?.language || 'ru';
    return i18n[lang]?.[key] || i18n.en[key] || key;
}

function getISODate() { return new Date().toISOString().split('T')[0]; }

function daysDiff(d1, d2) { return Math.floor((new Date(d2) - new Date(d1)) / 86400000); }

function getSettings() { return extension_settings.reproHealth; }

function updateMenstruationStatus() {
    const s = getSettings();
    const mens = s.menstruation;
    const day = s.fertility.cycleDay;
    
    if (s.pregnancy.isPregnant) {
        mens.isActive = false; mens.isPMS = false; mens.symptoms = [];
        return;
    }
    
    let dur = mens.duration;
    if (mens.irregularity > 0 && rollD100() <= mens.irregularity) {
        dur = Math.max(2, Math.min(8, dur + trueRandom(-2, 2)));
    }
    
    const wasActive = mens.isActive;
    
    if (day >= mens.startDay && day <= mens.startDay + dur - 1) {
        mens.isActive = true; mens.isPMS = false;
        const pd = day - mens.startDay + 1;
        mens.intensity = pd <= 2 ? (rollD100() <= 30 ? 'heavy' : 'normal') : pd >= dur - 1 ? 'light' : (rollD100() <= 20 ? 'heavy' : 'normal');
        mens.symptoms = periodSymptoms[s.language]?.[mens.intensity] || [];
    } else {
        mens.isActive = false;
        if (day >= mens.pmsStartDay) {
            mens.isPMS = true;
            const syms = pmsSymptoms[s.language] || pmsSymptoms.en;
            mens.symptoms = [...syms].sort(() => Math.random() - 0.5).slice(0, trueRandom(2, 4));
        } else {
            mens.isPMS = false; mens.symptoms = [];
        }
    }
    
    if (mens.isActive && !wasActive) {
        mens.lastPeriodDate = getISODate();
        s.history.periods.push({ date: getISODate(), day });
    }
    saveSettingsDebounced();
}

function getMenstruationStatus() {
    const s = getSettings();
    updateMenstruationStatus();
    if (s.pregnancy.isPregnant) return { status: 'pregnant' };
    
    const mens = s.menstruation;
    const day = s.fertility.cycleDay;
    let daysUntil = 0;
    if (!mens.isActive) {
        daysUntil = day < mens.startDay ? mens.startDay - day : s.fertility.cycleLength - day + mens.startDay;
    }
    
    return {
        isActive: mens.isActive, isPMS: mens.isPMS,
        periodDay: mens.isActive ? day - mens.startDay + 1 : 0,
        intensity: mens.intensity, symptoms: mens.symptoms,
        daysUntilPeriod: daysUntil, cycleDay: day
    };
}

function getFertilityModifier() {
    const s = getSettings();
    const day = s.fertility.cycleDay;
    const [ovS, ovE] = s.fertility.ovulationWindow;
    if (s.menstruation.isActive) return 0.05;
    if (day >= ovS && day <= ovE) return 3.0;
    if (day >= ovS - 3 && day <= ovE + 1) return 1.5;
    if (day <= 5 || day >= 26) return 0.1;
    return 0.5;
}

function advanceCycleDay(days = 1) {
    const s = getSettings();
    if (s.pregnancy.isPregnant) return;
    for (let i = 0; i < days; i++) {
        s.fertility.cycleDay = (s.fertility.cycleDay % s.fertility.cycleLength) + 1;
        updateMenstruationStatus();
    }
    if (s.contraception.pill) s.contraception.pillDaysTaken += days;
    saveSettingsDebounced();
}

function getContraceptionMultiplier() {
    const c = getSettings().contraception;
    let prot = 0;
    if (c.iud) prot = Math.max(prot, c.iudEffectiveness);
    if (c.implant) prot = Math.max(prot, c.implantEffectiveness);
    if (c.pill) {
        let eff = c.pillEffectiveness * (c.pillDaysTaken < 7 ? 0.5 : c.pillDaysTaken < 21 ? 0.85 : 1);
        prot = Math.max(prot, eff);
    }
    if (c.condom) {
        if (rollD100() <= 2) return { multiplier: 1, condomBroke: true };
        prot = Math.max(prot, c.condomEffectiveness);
    }
    if (c.withdrawal) prot = Math.max(prot, c.withdrawalEffectiveness);
    return { multiplier: (100 - prot) / 100, condomBroke: false };
}

function assessPartnerRisk(name) {
    const s = getSettings();
    if (!s.sti.character_sti_status[name]) {
        const roll = rollD100();
        let risk = 'safe', inf = [];
        if (roll > 95) {
            risk = 'high';
            if (rollD100() <= 50) {
                const all = Object.keys(stiDatabase);
                for (let i = 0; i < trueRandom(1, 2); i++) {
                    const x = all[trueRandom(0, all.length - 1)];
                    if (!inf.includes(x)) inf.push(x);
                }
            }
        } else if (roll > 80) {
            risk = 'medium';
            if (rollD100() <= 25) inf.push(['chlamydia', 'gonorrhea', 'herpes', 'hpv', 'trichomoniasis'][trueRandom(0, 4)]);
        } else if (roll > 60) {
            risk = 'low';
            if (rollD100() <= 10) inf.push(['chlamydia', 'gonorrhea', 'trichomoniasis'][trueRandom(0, 2)]);
        }
        s.sti.character_sti_status[name] = { riskLevel: risk, infected: inf };
        saveSettingsDebounced();
    }
    return s.sti.character_sti_status[name];
}

function checkSTITransmission(name, useCondom) {
    const s = getSettings();
    const partner = assessPartnerRisk(name);
    const user = s.sti.user_sti_status;
    const rates = s.sti.transmissionRates;
    const results = { newInfections: [], checks: [], partnerRisk: partner.riskLevel };
    
    for (const sti of partner.infected) {
        if (user.infected.includes(sti)) continue;
        let chance = rates[sti].maleToFemale;
        if (useCondom) chance *= (100 - rates[sti].condomReduction) / 100;
        const roll = rollD100();
        const got = roll <= chance;
        results.checks.push({ sti, chance: chance.toFixed(1), roll, infected: got });
        if (got) {
            results.newInfections.push(sti);
            user.infected.push(sti);
            user.history.push({ sti, date: getISODate(), source: name });
        }
    }
    saveSettingsDebounced();
    return results;
}

function conceptionRoll(useContra = true, partner = 'Unknown') {
    const s = getSettings();
    if (s.pregnancy.isPregnant) return { rolled: false, reason: 'pregnant' };
    
    let chance = s.fertility.baseFertility * getFertilityModifier();
    let contra = { multiplier: 1, condomBroke: false };
    if (useContra) {
        contra = getContraceptionMultiplier();
        chance *= contra.multiplier;
    }
    chance = Math.max(0.1, Math.min(95, chance * s.fertility.fertilityMultiplier));
    
    const roll = rollD100();
    const success = roll <= chance;
    
    const result = {
        rolled: true, roll, chance: chance.toFixed(1), conceived: success,
        fertilityMod: getFertilityModifier(), condomBroke: contra.condomBroke,
        cycleDay: s.fertility.cycleDay, duringPeriod: s.menstruation.isActive
    };
    
    s.history.conceptionRolls.push({ ...result, date: getISODate(), partner });
    
    if (success) {
        s.pregnancy.isPregnant = true;
        s.pregnancy.conceptionDate = getISODate();
        s.pregnancy.currentWeek = 0;
        s.pregnancy.complications = [];
        s.menstruation.isActive = false;
        s.menstruation.isPMS = false;
    }
    saveSettingsDebounced();
    return result;
}

function getPregnancyStatus() {
    const s = getSettings();
    if (!s.pregnancy.isPregnant) return null;
    
    const weeks = Math.floor(daysDiff(s.pregnancy.conceptionDate, getISODate()) / 7);
    s.pregnancy.currentWeek = weeks;
    
    let stage, tri;
    if (weeks < 12) { stage = t('early'); tri = 1; }
    else if (weeks < 24) { stage = t('showing'); tri = 2; }
    else if (weeks < 37) { stage = t('advanced'); tri = 3; }
    else { stage = t('labor'); tri = 3; }
    
    const lang = s.language;
    const vc = visibleChanges[lang];
    let changes = vc[0];
    for (const w of Object.keys(vc).map(Number).sort((a, b) => b - a)) {
        if (weeks >= w) { changes = vc[w]; break; }
    }
    
    saveSettingsDebounced();
    return { weeks, stage, trimester: tri, visibleChanges: changes, complications: s.pregnancy.complications };
}

function complicationCheck(tri) {
    const roll = rollD100();
    const lang = getSettings().language;
    let sev, desc;
    
    if (roll <= 5) {
        sev = 'severe';
        const opts = complications[tri].severe[lang];
        desc = opts[trueRandom(0, opts.length - 1)];
    } else if (roll <= 15) {
        sev = 'moderate';
        const opts = complications[tri].moderate[lang];
        desc = opts[trueRandom(0, opts.length - 1)];
    } else {
        sev = 'normal';
        desc = lang === 'ru' ? 'Всё в порядке' : 'All normal';
    }
    
    const result = { trimester: tri, roll, severity: sev, description: desc };
    if (sev !== 'normal') {
        getSettings().pregnancy.complications.push(result);
        saveSettingsDebounced();
    }
    return result;
}

function formatConceptionResult(r) {
    if (!r.rolled) return `<div class="reprohealth-block conception"><div class="reprohealth-block-header">🤰 Уже беременна</div></div>`;
    
    const fertLabel = r.fertilityMod >= 1.5 ? t('high_fertility') : r.fertilityMod >= 0.5 ? t('normal_fertility') : t('low_fertility');
    const fertClass = r.fertilityMod >= 1.5 ? 'danger' : r.fertilityMod >= 0.5 ? 'warning' : 'success';
    
    return `<div class="reprohealth-block conception ${r.conceived ? 'success' : 'fail'}">
<div class="reprohealth-block-header">${r.conceived ? t('conception_yes') : t('conception_no')}</div>
<div class="reprohealth-roll">
<span class="reprohealth-roll-dice">🎲</span>
<span class="reprohealth-roll-result">${r.roll}</span>
<span class="reprohealth-roll-target">/ ${r.chance}%</span>
</div>
${r.condomBroke ? `<div class="reprohealth-badge danger">${t('condom_broke')}</div>` : ''}
${r.duringPeriod ? `<div class="reprohealth-badge info">${t('during_period')}</div>` : ''}
<div class="reprohealth-block-row">
<span class="reprohealth-block-label">${t('cycle_day')}</span>
<span class="reprohealth-block-value">${r.cycleDay} <span class="reprohealth-badge ${fertClass}">${fertLabel}</span></span>
</div>
${r.conceived ? `<div class="reprohealth-block-row"><span class="reprohealth-block-label">${t('date')}</span><span class="reprohealth-block-value">${getISODate()}</span></div>` : ''}
</div>`;
}

function formatPregnancyStatus(s) {
    if (!s) return `<div class="reprohealth-block pregnancy"><div class="reprohealth-block-header">🤰 Not pregnant</div></div>`;
    const pct = Math.min(100, Math.round(s.weeks / 40 * 100));
    return `<div class="reprohealth-block pregnancy">
<div class="reprohealth-block-header">${t('pregnancy_status')}</div>
<div class="reprohealth-progress"><div class="reprohealth-progress-fill fertility-normal" style="width:${pct}%"></div></div>
<div class="reprohealth-block-row"><span class="reprohealth-block-label">${t('week')}</span><span class="reprohealth-block-value">${s.weeks}/40</span></div>
<div class="reprohealth-block-row"><span class="reprohealth-block-label">${t('stage')}</span><span class="reprohealth-block-value">${s.stage}</span></div>
<div class="reprohealth-block-row"><span class="reprohealth-block-label">${t('trimester')}</span><span class="reprohealth-block-value">${s.trimester}</span></div>
<div class="reprohealth-block-row"><span class="reprohealth-block-label">${t('visible_changes')}</span><span class="reprohealth-block-value">${s.visibleChanges}</span></div>
</div>`;
}

function formatMenstruationStatus(s) {
    if (s.status === 'pregnant') return `<div class="reprohealth-block period"><div class="reprohealth-block-header">🤰 Беременность</div></div>`;
    
    const blockClass = s.isActive ? 'active' : s.isPMS ? 'pms' : '';
    let status = s.isActive ? t('period_active') : s.isPMS ? t('pms_active') : t('no_period');
    
    return `<div class="reprohealth-block period ${blockClass}">
<div class="reprohealth-block-header">${t('period_status')}</div>
<div class="reprohealth-block-row"><span class="reprohealth-block-label">${t('status')}</span><span class="reprohealth-block-value">${status}</span></div>
<div class="reprohealth-block-row"><span class="reprohealth-block-label">${t('cycle_day')}</span><span class="reprohealth-block-value">${s.cycleDay}</span></div>
${s.isActive ? `<div class="reprohealth-block-row"><span class="reprohealth-block-label">${t('period_day')}</span><span class="reprohealth-block-value">${s.periodDay}</span></div>
<div class="reprohealth-block-row"><span class="reprohealth-block-label">${t('period_intensity')}</span><span class="reprohealth-block-value">${t('period_' + s.intensity)}</span></div>` : ''}
${!s.isActive && s.daysUntilPeriod ? `<div class="reprohealth-block-row"><span class="reprohealth-block-label">${t('next_period')}</span><span class="reprohealth-block-value">${s.daysUntilPeriod} дн.</span></div>` : ''}
${s.symptoms.length ? `<div class="reprohealth-symptoms">${s.symptoms.map(x => `<span class="reprohealth-symptom">${x}</span>`).join('')}</div>` : ''}
</div>`;
}

function formatSTICheck(r) {
    const lang = getSettings().language;
    const danger = r.newInfections.length > 0;
    
    let checksHtml = '';
    if (r.checks.length === 0) {
        checksHtml = `<div class="reprohealth-block-row"><span class="reprohealth-badge success">${lang === 'ru' ? 'Партнёр здоров' : 'Partner clean'}</span></div>`;
    } else {
        checksHtml = r.checks.map(c => `<div class="reprohealth-block-row">
<span class="reprohealth-block-label">${stiDatabase[c.sti].name[lang]}</span>
<span class="reprohealth-block-value">${c.roll}/${c.chance}% <span class="reprohealth-badge ${c.infected ? 'danger' : 'success'}">${c.infected ? t('infected') : t('safe')}</span></span>
</div>`).join('');
    }
    
    return `<div class="reprohealth-block sti ${danger ? 'danger' : ''}">
<div class="reprohealth-block-header">${t('sti_check')}</div>
<div class="reprohealth-block-row"><span class="reprohealth-block-label">${t('partner_risk')}</span><span class="reprohealth-block-value">${r.partnerRisk}</span></div>
${checksHtml}
${r.newInfections.length ? `<div class="reprohealth-badge danger" style="margin-top:10px">⚠️ ${r.newInfections.map(x => stiDatabase[x].name[lang]).join(', ')}</div>` : ''}
</div>`;
}

function formatComplicationCheck(r) {
    const sevClass = r.severity === 'severe' ? 'severe' : r.severity === 'moderate' ? '' : 'normal';
    const sevText = r.severity === 'severe' ? t('severe') : r.severity === 'moderate' ? t('moderate') : t('normal');
    const sevBadge = r.severity === 'severe' ? 'danger' : r.severity === 'moderate' ? 'warning' : 'success';
    
    return `<div class="reprohealth-block complication ${sevClass}">
<div class="reprohealth-block-header">${t('complication_check')} - ${t('trimester')} ${r.trimester}</div>
<div class="reprohealth-roll">
<span class="reprohealth-roll-dice">🎲</span>
<span class="reprohealth-roll-result">${r.roll}</span>
</div>
<div class="reprohealth-block-row"><span class="reprohealth-block-label">${t('result')}</span><span class="reprohealth-badge ${sevBadge}">${sevText}</span></div>
<div class="reprohealth-block-row"><span class="reprohealth-block-value">${r.description}</span></div>
</div>`;
}

function registerSlashCommands() {
    const ctx = window.SillyTavern?.getContext?.();
    if (!ctx?.registerSlashCommand) return;
    const reg = ctx.registerSlashCommand;
    
    reg('conception', (args) => formatConceptionResult(conceptionRoll(args?.nocontra !== 'true', args?.partner || 'Unknown')), [], '[partner=X] - Conception roll', true, true);
    reg('pregnancy', () => formatPregnancyStatus(getPregnancyStatus()), [], 'Pregnancy status', true, true);
    reg('period', () => formatMenstruationStatus(getMenstruationStatus()), [], 'Period status', true, true);
    reg('sticheck', (args) => formatSTICheck(checkSTITransmission(args?.partner || 'Unknown', getSettings().contraception.condom)), [], '[partner=X] - STI check', true, true);
    reg('complication', (args) => formatComplicationCheck(complicationCheck(parseInt(args?.trimester) || 1)), [], '[trimester=1-3]', true, true);
    reg('condom', (args) => {
        const s = getSettings();
        if (args?.value === 'on') s.contraception.condom = true;
        else if (args?.value === 'off') s.contraception.condom = false;
        else s.contraception.condom = !s.contraception.condom;
        saveSettingsDebounced();
        return `<div class="reprohealth-badge ${s.contraception.condom ? 'success' : 'warning'}">🩹 ${s.contraception.condom ? 'ON' : 'OFF'}</div>`;
    }, [], '[on/off]', true, true);
    reg('pill', (args) => {
        const s = getSettings();
        if (args?.value === 'on') s.contraception.pill = true;
        else if (args?.value === 'off') { s.contraception.pill = false; s.contraception.pillDaysTaken = 0; }
        else s.contraception.pill = !s.contraception.pill;
        saveSettingsDebounced();
        return `<div class="reprohealth-badge ${s.contraception.pill ? 'success' : 'warning'}">💊 ${s.contraception.pill ? 'ON' : 'OFF'}</div>`;
    }, [], '[on/off]', true, true);
    reg('cycleday', (args) => {
        const s = getSettings();
        if (args?.day) {
            const d = parseInt(args.day);
            if (d >= 1 && d <= s.fertility.cycleLength) { s.fertility.cycleDay = d; updateMenstruationStatus(); saveSettingsDebounced(); }
        }
        const f = getFertilityModifier();
        const m = getMenstruationStatus();
        const fClass = f >= 1.5 ? 'danger' : f >= 0.5 ? 'warning' : 'success';
        return `<div class="reprohealth-badge info">🗓️ ${s.fertility.cycleDay}</div> ${m.isActive ? '<span class="reprohealth-badge danger">🩸</span>' : ''} ${m.isPMS ? '<span class="reprohealth-badge warning">PMS</span>' : ''} <span class="reprohealth-badge ${fClass}">${f >= 1.5 ? 'HIGH' : f >= 0.5 ? 'NORM' : 'LOW'}</span>`;
    }, [], '[day=N]', true, true);
    reg('advanceday', (args) => {
        const days = parseInt(args?.days) || 1;
        advanceCycleDay(days);
        const s = getSettings();
        return `<div class="reprohealth-badge info">⏩ +${days}d → Day ${s.fertility.cycleDay}</div>`;
    }, [], '[days=N]', true, true);
    reg('reprohealth', () => { document.getElementById('reprohealth-settings')?.scrollIntoView(); return ''; }, [], 'Open settings', true, true);
}

function createSettingsPanel() {
    const html = `
<div id="reprohealth-settings" class="extension_settings">
<div class="inline-drawer">
<div class="inline-drawer-toggle inline-drawer-header">
<b>🤰 Reproductive Health</b>
<div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
</div>
<div class="inline-drawer-content">
<div class="reprohealth-setting"><label class="checkbox_label"><input type="checkbox" id="rh-enabled"><span>Enable</span></label></div>
<div class="reprohealth-setting"><label>Language</label><select id="rh-lang"><option value="ru">Русский</option><option value="en">English</option></select></div>
<hr><h4>💊 Contraception</h4>
<div class="reprohealth-setting"><label class="checkbox_label"><input type="checkbox" id="rh-condom"><span>Condom 85%</span></label></div>
<div class="reprohealth-setting"><label class="checkbox_label"><input type="checkbox" id="rh-pill"><span>Pill 91%</span></label></div>
<div class="reprohealth-setting"><label class="checkbox_label"><input type="checkbox" id="rh-iud"><span>IUD 99%</span></label></div>
<div class="reprohealth-setting"><label class="checkbox_label"><input type="checkbox" id="rh-withdrawal"><span>Withdrawal 78%</span></label></div>
<hr><h4>🩸 Menstruation</h4>
<div class="reprohealth-setting"><label>Duration</label><input type="number" id="rh-period-dur" min="2" max="8" value="5"></div>
<div class="reprohealth-setting"><label>Irregularity %</label><input type="number" id="rh-irreg" min="0" max="50" value="0"></div>
<hr><h4>🌡️ Fertility</h4>
<div class="reprohealth-setting"><label>Base %</label><input type="number" id="rh-base-fert" min="1" max="100" value="25"></div>
<div class="reprohealth-setting"><label>Cycle Day</label><input type="number" id="rh-cycle-day" min="1" max="28" value="1"></div>
<hr><h4>🔬 STI</h4>
<div class="reprohealth-setting"><label class="checkbox_label"><input type="checkbox" id="rh-sti"><span>Enable STI</span></label></div>
<hr>
<div id="rh-status" class="reprohealth-status"></div>
<div class="reprohealth-buttons">
<button id="rh-reset-preg" class="menu_button">Reset Preg</button>
<button id="rh-reset-sti" class="menu_button">Reset STI</button>
<button id="rh-reset-all" class="menu_button redWarningBG">Reset All</button>
</div>
</div>
</div>
</div>`;
    
    $('#extensions_settings2').append(html);
    
    const s = getSettings;
    $('#rh-enabled').on('change', function() { s().enabled = this.checked; saveSettingsDebounced(); });
    $('#rh-lang').on('change', function() { s().language = this.value; saveSettingsDebounced(); updateStatus(); });
    $('#rh-condom').on('change', function() { s().contraception.condom = this.checked; saveSettingsDebounced(); updateStatus(); });
    $('#rh-pill').on('change', function() { s().contraception.pill = this.checked; saveSettingsDebounced(); });
    $('#rh-iud').on('change', function() { s().contraception.iud = this.checked; saveSettingsDebounced(); });
    $('#rh-withdrawal').on('change', function() { s().contraception.withdrawal = this.checked; saveSettingsDebounced(); });
    $('#rh-period-dur').on('change', function() { s().menstruation.duration = parseInt(this.value); saveSettingsDebounced(); });
    $('#rh-irreg').on('change', function() { s().menstruation.irregularity = parseInt(this.value); saveSettingsDebounced(); });
    $('#rh-base-fert').on('change', function() { s().fertility.baseFertility = parseInt(this.value); saveSettingsDebounced(); });
    $('#rh-cycle-day').on('change', function() { s().fertility.cycleDay = parseInt(this.value); updateMenstruationStatus(); saveSettingsDebounced(); updateStatus(); });
    $('#rh-sti').on('change', function() { s().sti.enabled = this.checked; saveSettingsDebounced(); });
    
    $('#rh-reset-preg').on('click', () => { if(confirm('Reset?')) { s().pregnancy = {...defaultSettings.pregnancy}; saveSettingsDebounced(); updateStatus(); }});
    $('#rh-reset-sti').on('click', () => { if(confirm('Reset?')) { s().sti.user_sti_status = {...defaultSettings.sti.user_sti_status}; s().sti.character_sti_status = {}; saveSettingsDebounced(); updateStatus(); }});
    $('#rh-reset-all').on('click', () => { if(confirm('Reset ALL?')) { extension_settings.reproHealth = JSON.parse(JSON.stringify(defaultSettings)); saveSettingsDebounced(); loadUI(); updateStatus(); }});
}

function loadUI() {
    const s = getSettings();
    $('#rh-enabled').prop('checked', s.enabled);
    $('#rh-lang').val(s.language);
    $('#rh-condom').prop('checked', s.contraception.condom);
    $('#rh-pill').prop('checked', s.contraception.pill);
    $('#rh-iud').prop('checked', s.contraception.iud);
    $('#rh-withdrawal').prop('checked', s.contraception.withdrawal);
    $('#rh-period-dur').val(s.menstruation.duration);
    $('#rh-irreg').val(s.menstruation.irregularity);
    $('#rh-base-fert').val(s.fertility.baseFertility);
    $('#rh-cycle-day').val(s.fertility.cycleDay);
    $('#rh-sti').prop('checked', s.sti.enabled);
    updateStatus();
}

function updateStatus() {
    const s = getSettings();
    const lang = s.language;
    const mens = getMenstruationStatus();
    const fert = getFertilityModifier();
    
    let h = '';
    if (s.pregnancy.isPregnant) {
        const ps = getPregnancyStatus();
        h += `<p>🤰 <strong>${ps.weeks}</strong> ${lang === 'ru' ? 'нед.' : 'wks'}</p>`;
    } else {
        h += `<p>🤰 ${lang === 'ru' ? 'Не беременна' : 'Not pregnant'}</p>`;
    }
    
    if (mens.isActive) h += `<p>🩸 ${lang === 'ru' ? 'День' : 'Day'} ${mens.periodDay}</p>`;
    else if (mens.isPMS) h += `<p>😤 PMS</p>`;
    else if (mens.daysUntilPeriod) h += `<p>🩸 ${mens.daysUntilPeriod}d</p>`;
    
    const inf = s.sti.user_sti_status.infected;
    if (inf.length) h += `<p>🔬 ${inf.map(x => stiDatabase[x].name[lang]).join(', ')}</p>`;
    
    h += `<p>🗓️ ${s.fertility.cycleDay} | ${fert >= 1.5 ? '⚠️HIGH' : fert >= 0.5 ? 'norm' : 'low'}</p>`;
    
    $('#rh-status').html(h);
}

window.ReproHealth = {
    conceptionRoll, getPregnancyStatus, checkSTITransmission, complicationCheck,
    getMenstruationStatus, updateMenstruationStatus, formatConceptionResult,
    formatPregnancyStatus, formatSTICheck, formatComplicationCheck, formatMenstruationStatus,
    rollD100, trueRandom, advanceCycleDay, getFertilityModifier, getContraceptionMultiplier,
    assessPartnerRisk, stiDatabase, t
};

jQuery(async () => {
    if (!extension_settings.reproHealth) {
        extension_settings.reproHealth = JSON.parse(JSON.stringify(defaultSettings));
    } else {
        extension_settings.reproHealth = { ...JSON.parse(JSON.stringify(defaultSettings)), ...extension_settings.reproHealth };
    }
    saveSettingsDebounced();
    createSettingsPanel();
    loadUI();
    registerSlashCommands();
});
