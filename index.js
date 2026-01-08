import { getContext, extension_settings, saveSettingsDebounced } from "../../../extensions.js";
import { eventSource, event_types } from "../../../../script.js";

const defaultSettings = {
    enabled: true,
    language: 'ru',
    contraception: {
        condom: false,
        condomEffectiveness: 85,
        pill: false,
        pillEffectiveness: 91,
        pillDaysTaken: 0,
        iud: false,
        iudEffectiveness: 99,
        implant: false,
        implantEffectiveness: 99,
        withdrawal: false,
        withdrawalEffectiveness: 78
    },
    fertility: {
        baseFertility: 25,
        cycleDay: 1,
        cycleLength: 28,
        ovulationWindow: [12, 16],
        fertilityMultiplier: 1.0
    },
    menstruation: {
        isActive: false,
        startDay: 1,
        duration: 5,
        intensity: 'normal',
        pmsStartDay: 25,
        pmsDuration: 3,
        isPMS: false,
        lastPeriodDate: null,
        symptoms: [],
        irregularity: 0
    },
    sti: {
        enabled: true,
        character_sti_status: {},
        user_sti_status: {
            infected: [],
            history: [],
            lastTest: null
        },
        transmissionRates: {
            'chlamydia': { maleToFemale: 40, femaleToMale: 32, condomReduction: 80 },
            'gonorrhea': { maleToFemale: 50, femaleToMale: 20, condomReduction: 80 },
            'syphilis': { maleToFemale: 30, femaleToMale: 30, condomReduction: 50 },
            'herpes': { maleToFemale: 10, femaleToMale: 4, condomReduction: 30 },
            'hpv': { maleToFemale: 20, femaleToMale: 20, condomReduction: 70 },
            'hiv': { maleToFemale: 0.08, femaleToMale: 0.04, condomReduction: 85 },
            'trichomoniasis': { maleToFemale: 70, femaleToMale: 70, condomReduction: 60 }
        },
        partnerRiskLevel: 'unknown'
    },
    pregnancy: {
        isPregnant: false,
        conceptionDate: null,
        currentWeek: 0,
        complications: [],
        checkups: [],
        outcome: null
    },
    history: {
        encounters: [],
        conceptionRolls: [],
        stiChecks: [],
        periods: []
    }
};

const i18n = {
    ru: {
        conception_roll: "🤰 БРОСОК НА ЗАЧАТИЕ",
        roll: "Бросок",
        result: "Результат",
        conception_yes: "✅ ЗАЧАТИЕ ПРОИЗОШЛО",
        conception_no: "❌ ЗАЧАТИЕ НЕ ПРОИЗОШЛО",
        date: "Дата",
        status: "Статус",
        pregnancy_initiated: "Беременность началась (персонажи ещё не знают)",
        no_pregnancy_this_time: "В этот раз беременность не наступила",
        pregnancy_status: "🤰 СТАТУС БЕРЕМЕННОСТИ",
        week: "Неделя",
        stage: "Стадия",
        trimester: "Триместр",
        visible_changes: "Видимые изменения",
        early: "Ранняя",
        showing: "Заметная",
        advanced: "Поздняя",
        labor: "Роды",
        complication_check: "⚠️ ПРОВЕРКА ОСЛОЖНЕНИЙ",
        severe: "ТЯЖЁЛОЕ",
        moderate: "УМЕРЕННОЕ",
        normal: "НОРМА",
        sti_check: "🔬 ПРОВЕРКА ИППП",
        transmission: "Передача",
        infected: "Заражение",
        safe: "Безопасно",
        contraception_active: "💊 КОНТРАЦЕПЦИЯ",
        protection_level: "Уровень защиты",
        condom_used: "Презерватив использован",
        condom_broke: "⚠️ ПРЕЗЕРВАТИВ ПОРВАЛСЯ",
        fertility_window: "🌡️ ОКНО ФЕРТИЛЬНОСТИ",
        high_fertility: "ВЫСОКАЯ фертильность",
        low_fertility: "НИЗКАЯ фертильность",
        cycle_day: "День цикла",
        period_status: "🩸 МЕНСТРУАЦИЯ",
        period_active: "Идут месячные",
        period_day: "День месячных",
        period_intensity: "Интенсивность",
        period_light: "Скудные",
        period_normal: "Нормальные",
        period_heavy: "Обильные",
        pms_active: "ПМС активен",
        pms_symptoms: "Симптомы ПМС",
        no_period: "Месячных нет",
        period_started: "🩸 МЕСЯЧНЫЕ НАЧАЛИСЬ",
        period_ended: "Месячные закончились",
        next_period: "До следующих месячных"
    },
    en: {
        conception_roll: "🤰 CONCEPTION ROLL",
        roll: "Roll",
        result: "Result",
        conception_yes: "✅ CONCEPTION OCCURRED",
        conception_no: "❌ NO CONCEPTION",
        date: "Date",
        status: "Status",
        pregnancy_initiated: "Pregnancy initiated (unknown to characters yet)",
        no_pregnancy_this_time: "This time, no pregnancy occurred",
        pregnancy_status: "🤰 PREGNANCY STATUS",
        week: "Week",
        stage: "Stage",
        trimester: "Trimester",
        visible_changes: "Visible changes",
        early: "Early",
        showing: "Showing",
        advanced: "Advanced",
        labor: "Labor",
        complication_check: "⚠️ COMPLICATION CHECK",
        severe: "SEVERE",
        moderate: "MODERATE",
        normal: "NORMAL",
        sti_check: "🔬 STI CHECK",
        transmission: "Transmission",
        infected: "Infected",
        safe: "Safe",
        contraception_active: "💊 CONTRACEPTION",
        protection_level: "Protection level",
        condom_used: "Condom used",
        condom_broke: "⚠️ CONDOM BROKE",
        fertility_window: "🌡️ FERTILITY WINDOW",
        high_fertility: "HIGH fertility",
        low_fertility: "LOW fertility",
        cycle_day: "Cycle day",
        period_status: "🩸 MENSTRUATION",
        period_active: "Period active",
        period_day: "Period day",
        period_intensity: "Intensity",
        period_light: "Light",
        period_normal: "Normal",
        period_heavy: "Heavy",
        pms_active: "PMS active",
        pms_symptoms: "PMS symptoms",
        no_period: "No period",
        period_started: "🩸 PERIOD STARTED",
        period_ended: "Period ended",
        next_period: "Until next period"
    }
};

const pmsSymptoms = {
    ru: ['раздражительность', 'перепады настроения', 'усталость', 'вздутие живота', 'болезненность груди', 'головная боль', 'тяга к сладкому', 'бессонница', 'тревожность', 'плаксивость', 'боль в пояснице', 'отёки'],
    en: ['irritability', 'mood swings', 'fatigue', 'bloating', 'breast tenderness', 'headache', 'food cravings', 'insomnia', 'anxiety', 'tearfulness', 'back pain', 'swelling']
};

const periodSymptoms = {
    ru: {
        light: ['лёгкие спазмы', 'небольшой дискомфорт'],
        normal: ['спазмы внизу живота', 'усталость', 'дискомфорт'],
        heavy: ['сильные спазмы', 'слабость', 'головокружение', 'сильная боль']
    },
    en: {
        light: ['mild cramps', 'slight discomfort'],
        normal: ['abdominal cramps', 'fatigue', 'discomfort'],
        heavy: ['severe cramps', 'weakness', 'dizziness', 'intense pain']
    }
};

const stiDatabase = {
    chlamydia: {
        name: { ru: 'Хламидиоз', en: 'Chlamydia' },
        incubationDays: [7, 21],
        symptomatic: 0.3,
        symptoms: { ru: ['выделения', 'боль при мочеиспускании', 'боль внизу живота'], en: ['discharge', 'painful urination', 'pelvic pain'] },
        curable: true,
        treatmentDays: 7
    },
    gonorrhea: {
        name: { ru: 'Гонорея', en: 'Gonorrhea' },
        incubationDays: [2, 14],
        symptomatic: 0.5,
        symptoms: { ru: ['гнойные выделения', 'жжение', 'частое мочеиспускание'], en: ['purulent discharge', 'burning', 'frequent urination'] },
        curable: true,
        treatmentDays: 7
    },
    syphilis: {
        name: { ru: 'Сифилис', en: 'Syphilis' },
        incubationDays: [10, 90],
        symptomatic: 0.7,
        symptoms: { ru: ['безболезненная язва', 'сыпь', 'увеличение лимфоузлов'], en: ['painless sore', 'rash', 'swollen lymph nodes'] },
        curable: true,
        treatmentDays: 14
    },
    herpes: {
        name: { ru: 'Генитальный герпес', en: 'Genital Herpes' },
        incubationDays: [2, 12],
        symptomatic: 0.4,
        symptoms: { ru: ['болезненные пузырьки', 'зуд', 'общее недомогание'], en: ['painful blisters', 'itching', 'flu-like symptoms'] },
        curable: false,
        manageable: true
    },
    hpv: {
        name: { ru: 'ВПЧ', en: 'HPV' },
        incubationDays: [30, 180],
        symptomatic: 0.1,
        symptoms: { ru: ['бородавки', 'чаще бессимптомно'], en: ['warts', 'often asymptomatic'] },
        curable: false,
        clearable: true,
        clearanceYears: [1, 2]
    },
    hiv: {
        name: { ru: 'ВИЧ', en: 'HIV' },
        incubationDays: [14, 30],
        symptomatic: 0.5,
        symptoms: { ru: ['лихорадка', 'усталость', 'увеличение лимфоузлов', 'сыпь'], en: ['fever', 'fatigue', 'swollen lymph nodes', 'rash'] },
        curable: false,
        manageable: true
    },
    trichomoniasis: {
        name: { ru: 'Трихомониаз', en: 'Trichomoniasis' },
        incubationDays: [5, 28],
        symptomatic: 0.3,
        symptoms: { ru: ['пенистые выделения', 'зуд', 'запах'], en: ['frothy discharge', 'itching', 'odor'] },
        curable: true,
        treatmentDays: 7
    }
};

function trueRandom(min, max) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return min + (array[0] % (max - min + 1));
}

function rollD100() {
    return trueRandom(1, 100);
}

function t(key) {
    const lang = extension_settings.reproHealth?.language || 'ru';
    return i18n[lang][key] || i18n['en'][key] || key;
}

function getISODate() {
    return new Date().toISOString().split('T')[0];
}

function daysDiff(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

function updateMenstruationStatus() {
    const settings = extension_settings.reproHealth;
    const mens = settings.menstruation;
    const cycleDay = settings.fertility.cycleDay;
    
    if (settings.pregnancy.isPregnant) {
        mens.isActive = false;
        mens.isPMS = false;
        mens.symptoms = [];
        return;
    }
    
    const irregularityRoll = rollD100();
    let effectiveDuration = mens.duration;
    if (mens.irregularity > 0 && irregularityRoll <= mens.irregularity) {
        effectiveDuration += trueRandom(-2, 2);
        effectiveDuration = Math.max(2, Math.min(8, effectiveDuration));
    }
    
    const periodEnd = mens.startDay + effectiveDuration - 1;
    const wasActive = mens.isActive;
    
    if (cycleDay >= mens.startDay && cycleDay <= periodEnd) {
        mens.isActive = true;
        mens.isPMS = false;
        const periodDay = cycleDay - mens.startDay + 1;
        if (periodDay <= 2) {
            mens.intensity = rollD100() <= 30 ? 'heavy' : 'normal';
        } else if (periodDay >= effectiveDuration - 1) {
            mens.intensity = 'light';
        } else {
            mens.intensity = rollD100() <= 20 ? 'heavy' : 'normal';
        }
        const lang = settings.language;
        mens.symptoms = periodSymptoms[lang][mens.intensity];
    } else {
        mens.isActive = false;
        mens.intensity = 'none';
        const pmsEnd = (mens.pmsStartDay + mens.pmsDuration - 1) % settings.fertility.cycleLength || settings.fertility.cycleLength;
        if (cycleDay >= mens.pmsStartDay || (mens.pmsStartDay > pmsEnd && cycleDay <= pmsEnd)) {
            mens.isPMS = true;
            const lang = settings.language;
            const numSymptoms = trueRandom(2, 5);
            const shuffled = [...pmsSymptoms[lang]].sort(() => 0.5 - Math.random());
            mens.symptoms = shuffled.slice(0, numSymptoms);
        } else {
            mens.isPMS = false;
            mens.symptoms = [];
        }
    }
    
    if (mens.isActive && !wasActive) {
        mens.lastPeriodDate = getISODate();
        settings.history.periods.push({ startDate: getISODate(), cycleDay: cycleDay });
    }
    
    saveSettingsDebounced();
    return { started: mens.isActive && !wasActive, ended: !mens.isActive && wasActive };
}

function getMenstruationStatus() {
    const settings = extension_settings.reproHealth;
    const mens = settings.menstruation;
    const cycleDay = settings.fertility.cycleDay;
    updateMenstruationStatus();
    
    if (settings.pregnancy.isPregnant) {
        return { status: 'pregnant', message: settings.language === 'ru' ? 'Беременность - месячных нет' : 'Pregnant - no period' };
    }
    
    const periodEnd = mens.startDay + mens.duration - 1;
    const periodDay = mens.isActive ? (cycleDay - mens.startDay + 1) : 0;
    let daysUntilPeriod = 0;
    if (!mens.isActive) {
        if (cycleDay < mens.startDay) {
            daysUntilPeriod = mens.startDay - cycleDay;
        } else {
            daysUntilPeriod = settings.fertility.cycleLength - cycleDay + mens.startDay;
        }
    }
    
    return {
        isActive: mens.isActive,
        isPMS: mens.isPMS,
        periodDay: periodDay,
        intensity: mens.intensity,
        symptoms: mens.symptoms,
        daysUntilPeriod: daysUntilPeriod,
        cycleDay: cycleDay,
        lastPeriodDate: mens.lastPeriodDate
    };
}

function formatMenstruationStatus(status) {
    if (status.status === 'pregnant') {
        return `\`\`\`\n🤰 ${status.message}\n\`\`\``;
    }
    
    let output = `\`\`\`\n${t('period_status')}\n${t('cycle_day')}: ${status.cycleDay}\n`;
    
    if (status.isActive) {
        output += `${t('status')}: ${t('period_active')}\n${t('period_day')}: ${status.periodDay}\n${t('period_intensity')}: ${status.intensity === 'heavy' ? t('period_heavy') : status.intensity === 'light' ? t('period_light') : t('period_normal')}\n`;
        if (status.symptoms.length > 0) {
            output += `Симптомы: ${status.symptoms.join(', ')}\n`;
        }
    } else if (status.isPMS) {
        output += `${t('status')}: ${t('pms_active')}\n${t('pms_symptoms')}: ${status.symptoms.join(', ')}\n${t('next_period')}: ${status.daysUntilPeriod} дн.\n`;
    } else {
        output += `${t('status')}: ${t('no_period')}\n${t('next_period')}: ${status.daysUntilPeriod} дн.\n`;
    }
    output += '```';
    return output;
}

function getFertilityModifier() {
    const settings = extension_settings.reproHealth;
    const cycleDay = settings.fertility.cycleDay;
    const [ovStart, ovEnd] = settings.fertility.ovulationWindow;
    
    if (settings.menstruation.isActive) return 0.05;
    if (cycleDay >= ovStart && cycleDay <= ovEnd) return 3.0;
    if (cycleDay >= ovStart - 3 && cycleDay <= ovEnd + 1) return 1.5;
    if (cycleDay <= 5 || cycleDay >= 26) return 0.1;
    return 0.5;
}

function advanceCycleDay(days = 1) {
    const settings = extension_settings.reproHealth;
    if (settings.pregnancy.isPregnant) return;
    
    for (let i = 0; i < days; i++) {
        settings.fertility.cycleDay = (settings.fertility.cycleDay % settings.fertility.cycleLength) + 1;
        updateMenstruationStatus();
    }
    if (settings.contraception.pill) {
        settings.contraception.pillDaysTaken += days;
    }
    saveSettingsDebounced();
}

function getContraceptionMultiplier() {
    const settings = extension_settings.reproHealth;
    const contra = settings.contraception;
    let totalProtection = 0;
    
    if (contra.iud) totalProtection = Math.max(totalProtection, contra.iudEffectiveness);
    if (contra.implant) totalProtection = Math.max(totalProtection, contra.implantEffectiveness);
    if (contra.pill) {
        let pillEff = contra.pillEffectiveness;
        if (contra.pillDaysTaken < 7) pillEff *= 0.5;
        else if (contra.pillDaysTaken < 21) pillEff *= 0.85;
        totalProtection = Math.max(totalProtection, pillEff);
    }
    if (contra.condom) {
        const breakRoll = rollD100();
        if (breakRoll <= 2) return { multiplier: 1, condomBroke: true };
        totalProtection = Math.max(totalProtection, contra.condomEffectiveness);
    }
    if (contra.withdrawal) totalProtection = Math.max(totalProtection, contra.withdrawalEffectiveness);
    
    return { multiplier: (100 - totalProtection) / 100, condomBroke: false };
}

function assessPartnerRisk(characterName) {
    const settings = extension_settings.reproHealth;
    const charStatus = settings.sti.character_sti_status[characterName];
    
    if (!charStatus) {
        const riskRoll = rollD100();
        let riskLevel, infections = [];
        
        if (riskRoll <= 60) {
            riskLevel = 'safe';
        } else if (riskRoll <= 80) {
            riskLevel = 'low';
            if (rollD100() <= 10) {
                const curableSTIs = ['chlamydia', 'gonorrhea', 'trichomoniasis'];
                infections.push(curableSTIs[trueRandom(0, curableSTIs.length - 1)]);
            }
        } else if (riskRoll <= 95) {
            riskLevel = 'medium';
            if (rollD100() <= 25) {
                const commonSTIs = ['chlamydia', 'gonorrhea', 'herpes', 'hpv', 'trichomoniasis'];
                infections.push(commonSTIs[trueRandom(0, commonSTIs.length - 1)]);
            }
        } else {
            riskLevel = 'high';
            if (rollD100() <= 50) {
                const allSTIs = Object.keys(stiDatabase);
                const numInfections = trueRandom(1, 2);
                for (let i = 0; i < numInfections; i++) {
                    const sti = allSTIs[trueRandom(0, allSTIs.length - 1)];
                    if (!infections.includes(sti)) infections.push(sti);
                }
            }
        }
        
        settings.sti.character_sti_status[characterName] = { riskLevel, infected: infections, history: [], generated: true };
        saveSettingsDebounced();
    }
    return settings.sti.character_sti_status[characterName];
}

function checkSTITransmission(characterName, useCondom) {
    const settings = extension_settings.reproHealth;
    const partnerStatus = assessPartnerRisk(characterName);
    const userStatus = settings.sti.user_sti_status;
    const transmissionRates = settings.sti.transmissionRates;
    const results = { newInfections: [], checks: [], partnerRisk: partnerStatus.riskLevel };
    
    for (const sti of partnerStatus.infected) {
        if (userStatus.infected.includes(sti)) continue;
        const rates = transmissionRates[sti];
        let transmissionChance = rates.maleToFemale;
        if (useCondom) transmissionChance *= (100 - rates.condomReduction) / 100;
        const roll = rollD100();
        const infected = roll <= transmissionChance;
        results.checks.push({ sti, chance: transmissionChance.toFixed(2), roll, infected });
        if (infected) {
            results.newInfections.push(sti);
            userStatus.infected.push(sti);
            userStatus.history.push({ sti, date: getISODate(), source: characterName });
        }
    }
    saveSettingsDebounced();
    return results;
}

function conceptionRoll(useContraception = true, characterName = 'Unknown') {
    const settings = extension_settings.reproHealth;
    if (settings.pregnancy.isPregnant) return { rolled: false, reason: 'already_pregnant' };
    
    let conceptionChance = settings.fertility.baseFertility;
    const fertilityMod = getFertilityModifier();
    conceptionChance *= fertilityMod;
    
    let contraResult = { multiplier: 1, condomBroke: false };
    if (useContraception) {
        contraResult = getContraceptionMultiplier();
        conceptionChance *= contraResult.multiplier;
    }
    
    conceptionChance *= settings.fertility.fertilityMultiplier;
    conceptionChance = Math.max(0.1, Math.min(95, conceptionChance));
    
    const roll = rollD100();
    const conceived = roll <= conceptionChance;
    
    const result = {
        rolled: true, roll, chance: conceptionChance.toFixed(1), conceived, fertilityMod,
        contraceptionUsed: useContraception, condomBroke: contraResult.condomBroke,
        cycleDay: settings.fertility.cycleDay, duringPeriod: settings.menstruation.isActive
    };
    
    settings.history.conceptionRolls.push({ ...result, date: getISODate(), partner: characterName });
    
    if (conceived) {
        settings.pregnancy.isPregnant = true;
        settings.pregnancy.conceptionDate = getISODate();
        settings.pregnancy.currentWeek = 0;
        settings.pregnancy.complications = [];
        settings.menstruation.isActive = false;
        settings.menstruation.isPMS = false;
    }
    saveSettingsDebounced();
    return result;
}

function getPregnancyStatus() {
    const settings = extension_settings.reproHealth;
    if (!settings.pregnancy.isPregnant) return null;
    
    const daysSinceConception = daysDiff(settings.pregnancy.conceptionDate, getISODate());
    const weeks = Math.floor(daysSinceConception / 7);
    settings.pregnancy.currentWeek = weeks;
    
    let stage, trimester;
    if (weeks < 12) { stage = t('early'); trimester = 1; }
    else if (weeks < 24) { stage = t('showing'); trimester = 2; }
    else if (weeks < 37) { stage = t('advanced'); trimester = 3; }
    else { stage = t('labor'); trimester = 3; }
    
    const visibleChanges = getVisibleChanges(weeks, settings.language);
    saveSettingsDebounced();
    
    return { weeks, stage, trimester, visibleChanges, conceptionDate: settings.pregnancy.conceptionDate, complications: settings.pregnancy.complications };
}

function getVisibleChanges(weeks, lang = 'ru') {
    const changes = {
        ru: { 0: 'Изменений нет', 4: 'Лёгкая тошнота, усталость', 8: 'Увеличение груди, тошнота', 12: 'Небольшое округление живота', 16: 'Живот заметен в облегающей одежде', 20: 'Явно видимый живот, шевеления', 24: 'Большой живот, отёки', 28: 'Очень большой живот, одышка', 32: 'Живот очень большой, частые позывы', 36: 'Опущение живота, готовность к родам', 40: 'Полный срок, возможны роды' },
        en: { 0: 'No visible changes', 4: 'Mild nausea, fatigue', 8: 'Breast enlargement, nausea', 12: 'Slight belly rounding', 16: 'Belly visible in tight clothes', 20: 'Clearly visible belly, movements', 24: 'Large belly, swelling', 28: 'Very large belly, shortness of breath', 32: 'Very large belly, frequent urination', 36: 'Belly dropped, ready for birth', 40: 'Full term, labor possible' }
    };
    const c = changes[lang];
    const weekKeys = Object.keys(c).map(Number).sort((a, b) => b - a);
    for (const w of weekKeys) { if (weeks >= w) return c[w]; }
    return c[0];
}

function complicationCheck(trimester) {
    const roll = rollD100();
    let severity, description;
    const lang = extension_settings.reproHealth?.language || 'ru';
    
    const complications = {
        1: { severe: { ru: ['Угроза выкидыша', 'Внематочная беременность'], en: ['Miscarriage threat', 'Ectopic pregnancy'] }, moderate: { ru: ['Сильный токсикоз', 'Кровотечение'], en: ['Severe morning sickness', 'Bleeding'] } },
        2: { severe: { ru: ['Преждевременные роды', 'Гестационный диабет'], en: ['Preterm labor risk', 'Gestational diabetes'] }, moderate: { ru: ['Анемия', 'Повышенное давление'], en: ['Anemia', 'High blood pressure'] } },
        3: { severe: { ru: ['Преэклампсия', 'Отслойка плаценты'], en: ['Preeclampsia', 'Placental abruption'] }, moderate: { ru: ['Маловодие', 'Тазовое предлежание'], en: ['Low amniotic fluid', 'Breech position'] } }
    };
    
    if (roll <= 5) {
        severity = 'severe';
        const options = complications[trimester].severe[lang];
        description = options[trueRandom(0, options.length - 1)];
    } else if (roll <= 15) {
        severity = 'moderate';
        const options = complications[trimester].moderate[lang];
        description = options[trueRandom(0, options.length - 1)];
    } else {
        severity = 'normal';
        description = lang === 'ru' ? 'Всё в порядке' : 'All normal';
    }
    
    const result = { trimester, roll, severity, description };
    if (severity !== 'normal') {
        extension_settings.reproHealth.pregnancy.complications.push(result);
        saveSettingsDebounced();
    }
    return result;
}

function formatConceptionResult(result) {
    if (!result.rolled) return result.reason === 'already_pregnant' ? '🤰 Уже беременна - зачатие невозможно' : '';
    
    let output = `\`\`\`\n${t('conception_roll')}\n${t('roll')}: ${result.roll} / ${result.chance}%\n`;
    if (result.condomBroke) output += `${t('condom_broke')}\n`;
    if (result.duringPeriod) output += `🩸 Во время месячных (очень низкий шанс)\n`;
    output += `${t('cycle_day')}: ${result.cycleDay} (${result.fertilityMod >= 1.5 ? t('high_fertility') : t('low_fertility')})\n`;
    
    if (result.conceived) {
        output += `\n${t('conception_yes')}\n${t('date')}: ${getISODate()}\n${t('status')}: ${t('pregnancy_initiated')}\n\`\`\``;
    } else {
        output += `\n${t('conception_no')}\n${t('no_pregnancy_this_time')}\n\`\`\``;
    }
    return output;
}

function formatPregnancyStatus(status) {
    if (!status) return '';
    return `\`\`\`\n${t('pregnancy_status')}\n${t('week')}: ${status.weeks}\n${t('stage')}: ${status.stage}\n${t('trimester')}: ${status.trimester}\n${t('visible_changes')}: ${status.visibleChanges}\n\`\`\``;
}

function formatSTICheck(results) {
    const lang = extension_settings.reproHealth?.language || 'ru';
    let output = `\`\`\`\n${t('sti_check')}\nPartner Risk: ${results.partnerRisk}\n`;
    
    if (results.checks.length === 0) {
        output += lang === 'ru' ? 'Партнёр здоров - риска нет\n' : 'Partner is clean - no risk\n';
    } else {
        for (const check of results.checks) {
            const stiName = stiDatabase[check.sti].name[lang];
            output += `${stiName}: ${check.roll}/${check.chance}% - ${check.infected ? t('infected') : t('safe')}\n`;
        }
    }
    if (results.newInfections.length > 0) {
        output += `\n⚠️ ${lang === 'ru' ? 'НОВЫЕ ЗАРАЖЕНИЯ' : 'NEW INFECTIONS'}:\n`;
        for (const sti of results.newInfections) output += `- ${stiDatabase[sti].name[lang]}\n`;
    }
    output += '```';
    return output;
}

function formatComplicationCheck(result) {
    let severityText;
    if (result.severity === 'severe') severityText = t('severe');
    else if (result.severity === 'moderate') severityText = t('moderate');
    else severityText = t('normal');
    return `\`\`\`\n${t('complication_check')} - ${t('trimester')} ${result.trimester}\n${t('roll')}: ${result.roll}\n${t('result')}: ${severityText}\n${result.description}\n\`\`\``;
}

function registerSlashCommands() {
    const { registerSlashCommand } = window.SillyTavern?.getContext?.() || {};
    if (!registerSlashCommand) return;
    
    registerSlashCommand('conception', (args) => {
        const useContra = args?.nocontra !== 'true';
        const partner = args?.partner || 'Unknown';
        return formatConceptionResult(conceptionRoll(useContra, partner));
    }, [], '[partner=Name] [nocontra=true] - Roll for conception', true, true);
    
    registerSlashCommand('pregnancy', () => {
        const status = getPregnancyStatus();
        return status ? formatPregnancyStatus(status) : 'Not pregnant';
    }, [], 'Check pregnancy status', true, true);
    
    registerSlashCommand('sticheck', (args) => {
        const partner = args?.partner || 'Unknown';
        const useCondom = extension_settings.reproHealth?.contraception?.condom || false;
        return formatSTICheck(checkSTITransmission(partner, useCondom));
    }, [], '[partner=Name] - Check STI transmission', true, true);
    
    registerSlashCommand('complication', (args) => {
        const trimester = parseInt(args?.trimester) || 1;
        return formatComplicationCheck(complicationCheck(trimester));
    }, [], '[trimester=1-3] - Pregnancy complication check', true, true);
    
    registerSlashCommand('condom', (args) => {
        const settings = extension_settings.reproHealth;
        if (args?.value === 'on') settings.contraception.condom = true;
        else if (args?.value === 'off') settings.contraception.condom = false;
        else settings.contraception.condom = !settings.contraception.condom;
        saveSettingsDebounced();
        return `🩹 Condom: ${settings.contraception.condom ? 'ON' : 'OFF'}`;
    }, [], '[value=on/off] - Toggle condom', true, true);
    
    registerSlashCommand('pill', (args) => {
        const settings = extension_settings.reproHealth;
        if (args?.value === 'on') settings.contraception.pill = true;
        else if (args?.value === 'off') { settings.contraception.pill = false; settings.contraception.pillDaysTaken = 0; }
        else settings.contraception.pill = !settings.contraception.pill;
        saveSettingsDebounced();
        return `💊 Pill: ${settings.contraception.pill ? 'ON' : 'OFF'}`;
    }, [], '[value=on/off] - Toggle pill', true, true);
    
    registerSlashCommand('cycleday', (args) => {
        const settings = extension_settings.reproHealth;
        if (args?.day) {
            const day = parseInt(args.day);
            if (day >= 1 && day <= settings.fertility.cycleLength) {
                settings.fertility.cycleDay = day;
                updateMenstruationStatus();
                saveSettingsDebounced();
            }
        }
        const fertMod = getFertilityModifier();
        const mens = getMenstruationStatus();
        let status = `🗓️ Day ${settings.fertility.cycleDay}/${settings.fertility.cycleLength}`;
        if (mens.isActive) status += ' 🩸';
        if (mens.isPMS) status += ' (PMS)';
        status += ` | Fertility: ${fertMod >= 1.5 ? 'HIGH' : fertMod >= 0.5 ? 'NORMAL' : 'LOW'}`;
        return status;
    }, [], '[day=1-28] - Set/check cycle day', true, true);
    
    registerSlashCommand('period', () => formatMenstruationStatus(getMenstruationStatus()), [], 'Check menstruation status', true, true);
    
    registerSlashCommand('advanceday', (args) => {
        const days = parseInt(args?.days) || 1;
        advanceCycleDay(days);
        const settings = extension_settings.reproHealth;
        const mens = getMenstruationStatus();
        let result = `⏩ Advanced ${days} day(s). Now day ${settings.fertility.cycleDay}`;
        if (mens.isActive) result += ' 🩸 Period active';
        return result;
    }, [], '[days=N] - Advance cycle by N days', true, true);
    
    registerSlashCommand('reprohealth', () => {
        $('#reprohealth-settings-button').trigger('click');
        return 'Opening settings...';
    }, [], 'Open settings panel', true, true);
}

function createSettingsPanel() {
    const settingsHtml = `
    <div id="reprohealth-settings" class="extension_settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>🤰 Reproductive Health System</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <div class="reprohealth-setting"><label class="checkbox_label"><input type="checkbox" id="reprohealth-enabled"><span>Enable System</span></label></div>
                <div class="reprohealth-setting"><label>Language</label><select id="reprohealth-language"><option value="ru">Русский</option><option value="en">English</option></select></div>
                <hr><h4>💊 Contraception</h4>
                <div class="reprohealth-setting"><label class="checkbox_label"><input type="checkbox" id="reprohealth-condom"><span>Condom (85%)</span></label></div>
                <div class="reprohealth-setting"><label class="checkbox_label"><input type="checkbox" id="reprohealth-pill"><span>Pill (91%)</span></label></div>
                <div class="reprohealth-setting"><label class="checkbox_label"><input type="checkbox" id="reprohealth-iud"><span>IUD (99%)</span></label></div>
                <div class="reprohealth-setting"><label class="checkbox_label"><input type="checkbox" id="reprohealth-withdrawal"><span>Withdrawal (78%)</span></label></div>
                <hr><h4>🩸 Menstruation</h4>
                <div class="reprohealth-setting"><label>Period Duration (days)</label><input type="number" id="reprohealth-period-duration" min="2" max="8" value="5"></div>
                <div class="reprohealth-setting"><label>Irregularity (%)</label><input type="number" id="reprohealth-irregularity" min="0" max="50" value="0"></div>
                <hr><h4>🌡️ Fertility</h4>
                <div class="reprohealth-setting"><label>Base Fertility (%)</label><input type="number" id="reprohealth-base-fertility" min="1" max="100" value="25"></div>
                <div class="reprohealth-setting"><label>Cycle Day (1-28)</label><input type="number" id="reprohealth-cycle-day" min="1" max="28" value="1"></div>
                <hr><h4>🔬 STI System</h4>
                <div class="reprohealth-setting"><label class="checkbox_label"><input type="checkbox" id="reprohealth-sti-enabled"><span>Enable STI Tracking</span></label></div>
                <hr><h4>📊 Status</h4>
                <div id="reprohealth-status-display"></div>
                <div class="reprohealth-buttons">
                    <button id="reprohealth-reset-pregnancy" class="menu_button">Reset Pregnancy</button>
                    <button id="reprohealth-reset-sti" class="menu_button">Reset STI</button>
                    <button id="reprohealth-reset-all" class="menu_button redWarningBG">Reset All</button>
                </div>
            </div>
        </div>
    </div>`;
    
    $('#extensions_settings2').append(settingsHtml);
    
    $('#reprohealth-enabled').on('change', function() { extension_settings.reproHealth.enabled = this.checked; saveSettingsDebounced(); });
    $('#reprohealth-language').on('change', function() { extension_settings.reproHealth.language = this.value; saveSettingsDebounced(); updateStatusDisplay(); });
    $('#reprohealth-condom').on('change', function() { extension_settings.reproHealth.contraception.condom = this.checked; saveSettingsDebounced(); });
    $('#reprohealth-pill').on('change', function() { extension_settings.reproHealth.contraception.pill = this.checked; saveSettingsDebounced(); });
    $('#reprohealth-iud').on('change', function() { extension_settings.reproHealth.contraception.iud = this.checked; saveSettingsDebounced(); });
    $('#reprohealth-withdrawal').on('change', function() { extension_settings.reproHealth.contraception.withdrawal = this.checked; saveSettingsDebounced(); });
    $('#reprohealth-period-duration').on('change', function() { extension_settings.reproHealth.menstruation.duration = parseInt(this.value); saveSettingsDebounced(); });
    $('#reprohealth-irregularity').on('change', function() { extension_settings.reproHealth.menstruation.irregularity = parseInt(this.value); saveSettingsDebounced(); });
    $('#reprohealth-base-fertility').on('change', function() { extension_settings.reproHealth.fertility.baseFertility = parseInt(this.value); saveSettingsDebounced(); });
    $('#reprohealth-cycle-day').on('change', function() { extension_settings.reproHealth.fertility.cycleDay = parseInt(this.value); updateMenstruationStatus(); saveSettingsDebounced(); updateStatusDisplay(); });
    $('#reprohealth-sti-enabled').on('change', function() { extension_settings.reproHealth.sti.enabled = this.checked; saveSettingsDebounced(); });
    
    $('#reprohealth-reset-pregnancy').on('click', function() { if (confirm('Reset pregnancy?')) { extension_settings.reproHealth.pregnancy = { ...defaultSettings.pregnancy }; saveSettingsDebounced(); updateStatusDisplay(); } });
    $('#reprohealth-reset-sti').on('click', function() { if (confirm('Reset STI?')) { extension_settings.reproHealth.sti.user_sti_status = { ...defaultSettings.sti.user_sti_status }; extension_settings.reproHealth.sti.character_sti_status = {}; saveSettingsDebounced(); updateStatusDisplay(); } });
    $('#reprohealth-reset-all').on('click', function() { if (confirm('Reset ALL?')) { extension_settings.reproHealth = JSON.parse(JSON.stringify(defaultSettings)); saveSettingsDebounced(); loadSettings(); updateStatusDisplay(); } });
}

function loadSettings() {
    const s = extension_settings.reproHealth;
    $('#reprohealth-enabled').prop('checked', s.enabled);
    $('#reprohealth-language').val(s.language);
    $('#reprohealth-condom').prop('checked', s.contraception.condom);
    $('#reprohealth-pill').prop('checked', s.contraception.pill);
    $('#reprohealth-iud').prop('checked', s.contraception.iud);
    $('#reprohealth-withdrawal').prop('checked', s.contraception.withdrawal);
    $('#reprohealth-period-duration').val(s.menstruation.duration);
    $('#reprohealth-irregularity').val(s.menstruation.irregularity);
    $('#reprohealth-base-fertility').val(s.fertility.baseFertility);
    $('#reprohealth-cycle-day').val(s.fertility.cycleDay);
    $('#reprohealth-sti-enabled').prop('checked', s.sti.enabled);
    updateStatusDisplay();
}

function updateStatusDisplay() {
    const s = extension_settings.reproHealth;
    const lang = s.language;
    let html = '<div class="reprohealth-status">';
    
    if (s.pregnancy.isPregnant) {
        const status = getPregnancyStatus();
        html += `<p>🤰 <strong>${lang === 'ru' ? 'Беременность' : 'Pregnant'}</strong>: ${status.weeks} ${lang === 'ru' ? 'нед.' : 'wks'}</p>`;
    } else {
        html += `<p>🤰 ${lang === 'ru' ? 'Не беременна' : 'Not pregnant'}</p>`;
    }
    
    const mens = getMenstruationStatus();
    if (mens.isActive) html += `<p>🩸 <strong>${lang === 'ru' ? 'Месячные' : 'Period'}</strong>: ${lang === 'ru' ? 'день' : 'day'} ${mens.periodDay}</p>`;
    else if (mens.isPMS) html += `<p>😤 <strong>ПМС</strong>: ${mens.symptoms.slice(0, 2).join(', ')}</p>`;
    else if (mens.daysUntilPeriod) html += `<p>🩸 ${lang === 'ru' ? 'До месячных' : 'Until period'}: ${mens.daysUntilPeriod} ${lang === 'ru' ? 'дн.' : 'd'}</p>`;
    
    const infections = s.sti.user_sti_status.infected;
    if (infections.length > 0) html += `<p>🔬 <strong>STI</strong>: ${infections.map(x => stiDatabase[x].name[lang]).join(', ')}</p>`;
    else html += `<p>🔬 ${lang === 'ru' ? 'ИППП: нет' : 'STIs: none'}</p>`;
    
    const contra = [];
    if (s.contraception.condom) contra.push(lang === 'ru' ? '🩹' : '🩹');
    if (s.contraception.pill) contra.push('💊');
    if (s.contraception.iud) contra.push('🔗');
    if (contra.length > 0) html += `<p>💊 ${contra.join(' ')}</p>`;
    
    const fertMod = getFertilityModifier();
    const fertLevel = fertMod >= 1.5 ? '⚠️ HIGH' : fertMod >= 0.5 ? 'normal' : 'low';
    html += `<p>🗓️ ${lang === 'ru' ? 'День' : 'Day'}: ${s.fertility.cycleDay} (${fertLevel})</p>`;
    html += '</div>';
    
    $('#reprohealth-status-display').html(html);
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
    loadSettings();
    registerSlashCommands();
});
