import { 
    eventSource, 
    event_types,
    saveSettingsDebounced,
    setExtensionPrompt,
    extension_prompt_types
} from '../../../../script.js';
import { 
    extension_settings
} from '../../../extensions.js';

const extensionName = "reproductive_system";

// ==================== НАСТРОЙКИ ПО УМОЛЧАНИЮ ====================
const defaultSettings = {
    isEnabled: true,
    showNotifications: true,
    language: 'ru',
    
    // Контрацепция
    contraception: 'none', // none, condom, pill, iud
    
    // Состояние
    isPregnant: false,
    conceptionDate: null,
    fetusCount: 1,
    fetusSex: [],
    
    // Цикл (упрощённый — AI ведёт сам, но мы храним для модификатора шанса)
    cycleDay: 14, // По умолчанию середина — можно менять
    
    // Статистика
    totalChecks: 0,
    totalConceptions: 0
};

// ==================== ШАНСЫ ====================
const CHANCES = {
    // Базовый шанс зачатия
    base: 20,
    
    // Модификатор по дню цикла (множитель)
    cycleModifier: {
        // Дни 1-7: менструация, низкий шанс
        low: 0.25,      // 5%
        // Дни 8-11: фолликулярная, средний
        medium: 0.5,    // 10%
        // Дни 12-16: овуляция, высокий
        high: 1.65,     // 33%
        // Дни 17-28: лютеиновая, низкий
        luteal: 0.25    // 5%
    },
    
    // Эффективность контрацепции (% защиты)
    contraception: {
        none: 0,
        condom: 85,
        pill: 91,
        iud: 99
    },
    
    // Шанс многоплодной
    twins: 3,
    triplets: 0.1
};

// ==================== ЛОКАЛИЗАЦИЯ ====================
const LANG = {
    ru: {
        title: "🩺 Репродуктивная система",
        enabled: "Включить",
        notifications: "Уведомления",
        
        contraceptionTitle: "Контрацепция:",
        contraceptionTypes: {
            none: "❌ Без защиты",
            condom: "🎈 Презерватив (85%)",
            pill: "💊 Таблетки (91%)",
            iud: "🔷 Спираль (99%)"
        },
        
        cycleDay: "День цикла:",
        cycleDays: {
            fertile: "🔴 Фертильные дни (12-16)",
            safe: "🟢 Безопасные дни"
        },
        
        status: "Статус:",
        notPregnant: "Не беременна",
        pregnant: "🤰 Беременна",
        
        conceptionSuccess: "✅ ЗАЧАТИЕ ПРОИЗОШЛО!",
        conceptionFail: "❌ Зачатие не произошло",
        contraceptionFailed: "⚠️ Контрацепция подвела!",
        
        stats: "Проверок: {checks} | Зачатий: {conceptions}",
        
        reset: "Сбросить беременность"
    },
    en: {
        title: "🩺 Reproductive System",
        enabled: "Enable",
        notifications: "Notifications",
        
        contraceptionTitle: "Contraception:",
        contraceptionTypes: {
            none: "❌ None",
            condom: "🎈 Condom (85%)",
            pill: "💊 Pill (91%)",
            iud: "🔷 IUD (99%)"
        },
        
        cycleDay: "Cycle day:",
        cycleDays: {
            fertile: "🔴 Fertile days (12-16)",
            safe: "🟢 Safe days"
        },
        
        status: "Status:",
        notPregnant: "Not pregnant",
        pregnant: "🤰 Pregnant",
        
        conceptionSuccess: "✅ CONCEPTION OCCURRED!",
        conceptionFail: "❌ No conception",
        contraceptionFailed: "⚠️ Contraception failed!",
        
        stats: "Checks: {checks} | Conceptions: {conceptions}",
        
        reset: "Reset pregnancy"
    }
};

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function getSettings() {
    return extension_settings[extensionName];
}

function L(key) {
    const s = getSettings();
    const lang = s?.language || 'ru';
    const keys = key.split('.');
    let result = LANG[lang];
    for (const k of keys) {
        result = result?.[k];
    }
    return result || key;
}

function roll(max = 100) {
    return Math.floor(Math.random() * max) + 1;
}

function getCycleModifier(day) {
    if (day >= 12 && day <= 16) return CHANCES.cycleModifier.high;
    if (day >= 8 && day <= 11) return CHANCES.cycleModifier.medium;
    if (day >= 17) return CHANCES.cycleModifier.luteal;
    return CHANCES.cycleModifier.low;
}

// ==================== ОСНОВНАЯ ЛОГИКА ====================

function checkConception() {
    const s = getSettings();
    
    if (!s.isEnabled) return null;
    
    if (s.isPregnant) {
        console.log('[Reproductive] Already pregnant, skipping check');
        return null;
    }
    
    s.totalChecks++;
    
    // Базовый шанс с модификатором цикла
    const cycleModifier = getCycleModifier(s.cycleDay);
    let chance = Math.round(CHANCES.base * cycleModifier);
    
    // Контрацепция
    const contraceptionEff = CHANCES.contraception[s.contraception];
    let contraceptionFailed = false;
    
    if (s.contraception !== 'none') {
        const failRoll = roll(100);
        if (failRoll > contraceptionEff) {
            // Контрацепция подвела!
            contraceptionFailed = true;
            if (s.showNotifications) {
                showNotification(L('contraceptionFailed'), 'warning');
            }
        } else {
            // Контрацепция сработала — шанс почти 0
            chance = Math.round(chance * (1 - contraceptionEff / 100));
        }
    }
    
    const conceptionRoll = roll(100);
    const success = conceptionRoll <= chance;
    
    console.log(`[Reproductive] Check: roll=${conceptionRoll}, need≤${chance}, contraception=${s.contraception}, failed=${contraceptionFailed}, result=${success ? 'PREGNANT' : 'no'}`);
    
    const result = {
        roll: conceptionRoll,
        chance: chance,
        contraception: s.contraception,
        contraceptionFailed: contraceptionFailed,
        cycleDay: s.cycleDay,
        success: success
    };
    
    if (success) {
        // Зачатие!
        s.isPregnant = true;
        s.conceptionDate = new Date().toISOString();
        s.totalConceptions++;
        
        // Количество плодов
        const multiplesRoll = roll(1000) / 10;
        if (multiplesRoll <= CHANCES.triplets) {
            s.fetusCount = 3;
        } else if (multiplesRoll <= CHANCES.twins) {
            s.fetusCount = 2;
        } else {
            s.fetusCount = 1;
        }
        
        // Пол определится позже (AI сам)
        s.fetusSex = [];
        
        if (s.showNotifications) {
            showNotification(L('conceptionSuccess'), 'success');
        }
    } else {
        if (s.showNotifications) {
            showNotification(L('conceptionFail'), 'info');
        }
    }
    
    saveSettingsDebounced();
    syncUI();
    
    return result;
}

function resetPregnancy() {
    const s = getSettings();
    s.isPregnant = false;
    s.conceptionDate = null;
    s.fetusCount = 1;
    s.fetusSex = [];
    saveSettingsDebounced();
    syncUI();
    updatePromptInjection();
}

// ==================== ДЕТЕКЦИЯ ТЕГА ====================

function onMessageReceived() {
    const s = getSettings();
    if (!s.isEnabled) return;
    
    // Получаем последнее сообщение из глобального chat (доступен в SillyTavern)
    const chatArray = typeof chat !== 'undefined' ? chat : window.chat;
    if (!chatArray || chatArray.length === 0) return;
    
    const lastMessage = chatArray[chatArray.length - 1];
    
    if (!lastMessage || lastMessage.is_user) return;
    
    const text = lastMessage.mes || '';
    
    // Ищем тег проверки зачатия
    if (text.includes('[CONCEPTION_CHECK]') || text.includes('[ПРОВЕРКА_ЗАЧАТИЯ]')) {
        console.log('[Reproductive] Tag detected! Rolling conception check...');
        
        // Пытаемся прочитать день цикла из тега AI
        const cycleDayMatch = text.match(/\[CYCLE_DAY:(\d+)\]/);
        if (cycleDayMatch) {
            const aiCycleDay = parseInt(cycleDayMatch[1]);
            if (aiCycleDay >= 1 && aiCycleDay <= 28) {
                s.cycleDay = aiCycleDay;
                saveSettingsDebounced();
                console.log('[Reproductive] Cycle day from AI:', aiCycleDay);
            }
        }
        
        const result = checkConception();
        
        if (result) {
            // Инжектим результат для следующего сообщения
            injectConceptionResult(result);
        }
    }
}

// ==================== ИНЖЕКТЫ ====================

function getBasePrompt() {
    const s = getSettings();
    
    if (!s.isEnabled) return '';
    
    const contraceptionInstructions = {
        'none': `КОНТРАЦЕПЦИЯ: ❌ НЕ ИСПОЛЬЗУЕТСЯ
Персонаж НЕ предохраняется. При вагинальном сексе — риск беременности.`,
        'condom': `КОНТРАЦЕПЦИЯ: 🎈 ПРЕЗЕРВАТИВ
Персонаж ВСЕГДА использует презерватив при вагинальном сексе.
ОБЯЗАТЕЛЬНО описывай: достаёт презерватив, надевает, и т.д.
Презерватив может ПОРВАТЬСЯ или СОСКОЛЬЗНУТЬ (редко, ~15% шанс провала).
Если презерватив порвался/соскользнул — опиши это явно в сцене.`,
        'pill': `КОНТРАЦЕПЦИЯ: 💊 ПРОТИВОЗАЧАТОЧНЫЕ ТАБЛЕТКИ
Персонаж принимает оральные контрацептивы ежедневно.
Таблетки могут не сработать (~9% шанс провала): пропуск приёма, лекарства, болезнь.`,
        'iud': `КОНТРАЦЕПЦИЯ: 🔷 ВНУТРИМАТОЧНАЯ СПИРАЛЬ (ВМС)
У персонажа установлена спираль. Очень надёжно (~99%).
Крайне редко может сместиться или выпасть.`
    };
    
    let prompt = `[OOC: 🩺 REPRODUCTIVE SYSTEM — ACTIVE

${contraceptionInstructions[s.contraception]}

═══════════════════════════════════════
📅 МЕНСТРУАЛЬНЫЙ ЦИКЛ — ОТСЛЕЖИВАЙ АВТОМАТИЧЕСКИ

В НАЧАЛЕ КАЖДОГО ответа (или когда прошло время) показывай:
\`\`\`
🩸 ЦИКЛ: День [1-28] | Фаза: [название]
   Фертильность: [низкая/средняя/ВЫСОКАЯ]
\`\`\`

ФАЗЫ ЦИКЛА (28 дней):
• День 1-5: 🔴 Менструация (кровотечение, спазмы, усталость)
• День 6-11: Фолликулярная (энергия растёт, настроение улучшается)  
• День 12-16: 🔥 ОВУЛЯЦИЯ (пик либидо, ВЫСОКАЯ фертильность!)
• День 17-28: Лютеиновая (ПМС к концу: раздражительность, отёки, тяга к еде)

После 28 дня → цикл начинается заново с дня 1.
Учитывай симптомы фазы в поведении/ощущениях персонажа.

═══════════════════════════════════════
🎲 ПРОВЕРКА ЗАЧАТИЯ

Когда происходит ВАГИНАЛЬНЫЙ СЕКС с ЭЯКУЛЯЦИЕЙ ВНУТРЬ:
${s.contraception === 'none' ? 
'• Без защиты → ВСЕГДА добавляй тег проверки' :
'• Сначала опиши использование контрацепции\n• Если защита ПОДВЕЛА (порвалась/забыла/сместилась) → добавляй тег'}

ФОРМАТ (в конце ответа):
[CYCLE_DAY:число][CONCEPTION_CHECK]

Пример: [CYCLE_DAY:14][CONCEPTION_CHECK]

НЕ добавляй тег при: оральном, анальном, прерванном акте, эякуляции снаружи, успешной контрацепции.
]`;
    
    return prompt;
}

function getPregnancyPrompt() {
    const s = getSettings();
    
    if (!s.isPregnant) return '';
    
    let fetusText = s.fetusCount > 1 ? `\nМногоплодная: ${s.fetusCount === 2 ? 'ДВОЙНЯ' : 'ТРОЙНЯ'}` : '';
    
    let prompt = `

═══════════════════════════════════════
🤰 БЕРЕМЕННОСТЬ — АКТИВНА
═══════════════════════════════════════
Дата зачатия (реальная): ${s.conceptionDate}${fetusText}

ОТСЛЕЖИВАЙ АВТОМАТИЧЕСКИ! В начале КАЖДОГО ответа показывай:
\`\`\`
🤰 БЕРЕМЕННОСТЬ: Неделя [X] | Триместр [1/2/3]
   Стадия: [название]
   Симптомы: [текущие]
   Видимость: [не видно / едва заметно / заметно / очевидно]
\`\`\`

РАЗВИТИЕ ПО НЕДЕЛЯМ:
• 1-4: Имплантация. Симптомов нет. Персонаж НЕ ЗНАЕТ.
• 5-8: Эмбрион. Тошнота, усталость, задержка. Можно заподозрить.
• 9-12: Ранний плод. Токсикоз. Живот не виден.
• 13-16: Токсикоз уходит. Живот начинает расти. Первые шевеления (повторнород.)
• 17-20: Шевеления ощутимы. Живот заметен. Пол виден на УЗИ.
• 21-27: Активные шевеления. Живот очевиден. Отёки, боли в спине.
• 28-36: Большой живот. Одышка. Тренировочные схватки.
• 37-40: Доношенный. Опущение живота. Предвестники родов.
• 41+: Переношенный. Нужна стимуляция.

ПРОВЕРКИ ОСЛОЖНЕНИЙ — в начале каждого триместра (нед. 1, 13, 28):
\`\`\`
⚠️ ПРОВЕРКА ОСЛОЖНЕНИЙ | Триместр [#]
Бросок: [1-100]
├─ 1-5: 🔴 КРИТИЧЕСКОЕ (выкидыш, внематочная, отслойка...)
├─ 6-15: 🟡 СЕРЬЁЗНОЕ (кровотечение, преэклампсия, диабет...)
├─ 16-25: 🟠 УМЕРЕННОЕ (сильный токсикоз, анемия, тонус...)
└─ 26-100: 🟢 НОРМА
\`\`\`

Персонаж НЕ ЗНАЕТ о беременности пока нет явных симптомов или теста!
При осложнениях — описывай симптомы реалистично и драматично.
]`;
    
    return prompt;
}

function updatePromptInjection() {
    const s = getSettings();
    
    if (!s.isEnabled) {
        setExtensionPrompt(extensionName, '', extension_prompt_types.IN_CHAT, 0);
        return;
    }
    
    const fullPrompt = getBasePrompt() + getPregnancyPrompt();
    
    setExtensionPrompt(
        extensionName,
        fullPrompt,
        extension_prompt_types.IN_CHAT,
        0
    );
}

function injectConceptionResult(result) {
    const s = getSettings();
    
    const phaseNames = {
        1: 'Менструация', 2: 'Менструация', 3: 'Менструация', 4: 'Менструация', 5: 'Менструация',
        6: 'Фолликулярная', 7: 'Фолликулярная', 8: 'Фолликулярная', 9: 'Фолликулярная', 10: 'Фолликулярная', 11: 'Фолликулярная',
        12: 'ОВУЛЯЦИЯ', 13: 'ОВУЛЯЦИЯ', 14: 'ОВУЛЯЦИЯ', 15: 'ОВУЛЯЦИЯ', 16: 'ОВУЛЯЦИЯ',
        17: 'Лютеиновая', 18: 'Лютеиновая', 19: 'Лютеиновая', 20: 'Лютеиновая', 21: 'Лютеиновая',
        22: 'Лютеиновая', 23: 'Лютеиновая', 24: 'Лютеиновая', 25: 'Лютеиновая', 26: 'Лютеиновая',
        27: 'Лютеиновая', 28: 'Лютеиновая'
    };
    
    let resultText = `
[OOC: 
╔══════════════════════════════════════╗
║      🎲 ПРОВЕРКА ЗАЧАТИЯ             ║
╠══════════════════════════════════════╣
║ 📅 День цикла: ${result.cycleDay} (${phaseNames[result.cycleDay] || 'N/A'})
║ 🛡️ Контрацепция: ${L('contraceptionTypes.' + result.contraception)}
${result.contraceptionFailed ? '║ ⚠️ КОНТРАЦЕПЦИЯ ПОДВЕЛА!\n' : ''}║ 📊 Шанс зачатия: ${result.chance}%
║ 🎲 Бросок: ${result.roll}
║
║ ══ РЕЗУЛЬТАТ ══
║ ${result.success ? '✅ ЗАЧАТИЕ ПРОИЗОШЛО!' : '❌ Зачатие не произошло'}
${result.success && s.fetusCount > 1 ? `║ 👶 Плодов: ${s.fetusCount} (${s.fetusCount === 2 ? 'двойня' : 'тройня'}!)\n` : ''}╚══════════════════════════════════════╝
${result.success ? '\nБеременность началась! Персонаж пока НЕ ЗНАЕТ об этом.' : ''}
]`;
    
    // Инжектим результат
    setExtensionPrompt(
        extensionName + '_result',
        resultText,
        extension_prompt_types.IN_CHAT,
        1
    );
    
    // Обновляем основной промпт (добавится инструкция по беременности если зачатие)
    updatePromptInjection();
    
    // Очищаем результат через небольшую задержку
    setTimeout(() => {
        setExtensionPrompt(extensionName + '_result', '', extension_prompt_types.IN_CHAT, 1);
    }, 500);
}

// ==================== UI ====================

function showNotification(message, type = 'info') {
    if (typeof toastr !== 'undefined') {
        const options = {
            timeOut: 4000,
            positionClass: 'toast-top-center',
            closeButton: true
        };
        
        switch(type) {
            case 'success': toastr.success(message, '🩺', options); break;
            case 'warning': toastr.warning(message, '🩺', options); break;
            case 'error': toastr.error(message, '🩺', options); break;
            default: toastr.info(message, '🩺', options);
        }
    }
}

function syncUI() {
    const s = getSettings();
    
    // Чекбоксы
    const enabled = document.getElementById('repro_enabled');
    const notify = document.getElementById('repro_notify');
    if (enabled) enabled.checked = s.isEnabled;
    if (notify) notify.checked = s.showNotifications;
    
    // Контрацепция
    const contraSelect = document.getElementById('repro_contraception');
    if (contraSelect) contraSelect.value = s.contraception;
    
    // День цикла
    const cycleInput = document.getElementById('repro_cycle_day');
    const currentCycle = document.getElementById('repro_current_cycle');
    if (cycleInput) cycleInput.value = s.cycleDay;
    if (currentCycle) {
        const day = s.cycleDay;
        let phase, emoji;
        if (day <= 5) {
            phase = 'Менструация';
            emoji = '🔴';
        } else if (day <= 11) {
            phase = 'Фолликулярная';
            emoji = '🟡';
        } else if (day <= 16) {
            phase = 'ОВУЛЯЦИЯ';
            emoji = '🔥';
        } else {
            phase = 'Лютеиновая';
            emoji = '🟢';
        }
        currentCycle.innerHTML = `${emoji} День <strong>${day}</strong>/28 — ${phase}`;
    }
    
    // Статус
    const status = document.getElementById('repro_status');
    if (status) {
        if (s.isPregnant) {
            status.innerHTML = `<span style="color: #ff9ff3;">🤰 Беременна</span>`;
        } else {
            status.innerHTML = `<span style="opacity: 0.7;">Не беременна</span>`;
        }
    }
    
    // Кнопка сброса
    const resetBtn = document.getElementById('repro_reset');
    if (resetBtn) {
        resetBtn.style.display = s.isPregnant ? 'block' : 'none';
    }
    
    // Статистика
    const stats = document.getElementById('repro_stats');
    if (stats) {
        stats.textContent = `Проверок: ${s.totalChecks} | Зачатий: ${s.totalConceptions}`;
    }
}

function setupUI() {
    const s = getSettings();
    
    const settingsHtml = `
        <div class="repro_system_settings">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>${L('title')}</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content">
                    
                    <div class="flex-container">
                        <label class="checkbox_label">
                            <input type="checkbox" id="repro_enabled">
                            <span>${L('enabled')}</span>
                        </label>
                        <label class="checkbox_label">
                            <input type="checkbox" id="repro_notify">
                            <span>${L('notifications')}</span>
                        </label>
                    </div>
                    
                    <hr>
                    
                    <!-- Контрацепция -->
                    <div class="flex-container flexFlowColumn">
                        <label><strong>${L('contraceptionTitle')}</strong></label>
                        <select id="repro_contraception" class="text_pole">
                            <option value="none">${L('contraceptionTypes.none')}</option>
                            <option value="condom">${L('contraceptionTypes.condom')}</option>
                            <option value="pill">${L('contraceptionTypes.pill')}</option>
                            <option value="iud">${L('contraceptionTypes.iud')}</option>
                        </select>
                    </div>
                    
                    <hr>
                    
                    <!-- Текущий день цикла (от AI) -->
                    <div class="flex-container flexFlowColumn">
                        <label><strong>📅 Цикл (последний от AI):</strong></label>
                        <div id="repro_current_cycle" style="padding: 5px; background: var(--SmartThemeBlurTintColor); border-radius: 5px;">
                            <span>День ${s.cycleDay}</span>
                        </div>
                    </div>
                    
                    <!-- Начальный день цикла -->
                    <div class="flex-container flexFlowColumn" style="margin-top: 10px;">
                        <label style="opacity: 0.7;">
                            <small>Установить день вручную:</small>
                        </label>
                        <div class="flex-container" style="gap: 5px; align-items: center;">
                            <input type="number" id="repro_cycle_day" min="1" max="28" value="${s.cycleDay}" class="text_pole" style="width: 60px;">
                            <button id="repro_set_cycle" class="menu_button" style="padding: 5px 10px;">Применить</button>
                        </div>
                    </div>
                    
                    <hr>
                    
                    <!-- Статус -->
                    <div class="flex-container flexFlowColumn">
                        <label><strong>${L('status')}</strong></label>
                        <div id="repro_status">
                            <span style="opacity: 0.7;">${L('notPregnant')}</span>
                        </div>
                    </div>
                    
                    <button id="repro_reset" class="menu_button redWarningBG" style="display: none; margin-top: 10px;">
                        ${L('reset')}
                    </button>
                    
                    <hr>
                    
                    <small id="repro_stats" style="opacity: 0.5;">Проверок: 0 | Зачатий: 0</small>
                    
                </div>
            </div>
        </div>
        
        <style>
            .repro_system_settings .inline-drawer-content {
                padding: 10px;
            }
            .repro_system_settings hr {
                margin: 10px 0;
                border-color: var(--SmartThemeBorderColor);
                opacity: 0.3;
            }
            .repro_system_settings select,
            .repro_system_settings input[type="number"] {
                margin-top: 5px;
            }
        </style>
    `;
    
    $('#extensions_settings').append(settingsHtml);
    
    // Обработчики
    $('#repro_enabled').on('change', function() {
        getSettings().isEnabled = this.checked;
        saveSettingsDebounced();
        updatePromptInjection();
    });
    
    $('#repro_notify').on('change', function() {
        getSettings().showNotifications = this.checked;
        saveSettingsDebounced();
    });
    
    $('#repro_contraception').on('change', function() {
        const value = this.value;
        console.log('[Reproductive] Contraception changed to:', value);
        getSettings().contraception = value;
        saveSettingsDebounced();
        updatePromptInjection();
        syncUI();
    });
    
    $('#repro_set_cycle').on('click', function() {
        const input = document.getElementById('repro_cycle_day');
        const value = parseInt(input.value) || 14;
        const clamped = Math.max(1, Math.min(28, value));
        input.value = clamped;
        getSettings().cycleDay = clamped;
        saveSettingsDebounced();
        syncUI();
        showNotification(`День цикла установлен: ${clamped}`, 'info');
    });
    
    $('#repro_reset').on('click', function() {
        if (confirm('Сбросить беременность?')) {
            resetPregnancy();
            showNotification('Беременность сброшена', 'info');
        }
    });
    
    syncUI();
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

function loadSettings() {
    if (!extension_settings[extensionName]) {
        extension_settings[extensionName] = structuredClone(defaultSettings);
    }
    
    for (const key in defaultSettings) {
        if (extension_settings[extensionName][key] === undefined) {
            extension_settings[extensionName][key] = defaultSettings[key];
        }
    }
    
    console.log('[Reproductive] Settings loaded:', extension_settings[extensionName]);
}

jQuery(async () => {
    console.log('[Reproductive System] Loading...');
    
    loadSettings();
    setupUI();
    updatePromptInjection();
    
    // Слушаем сообщения от AI
    eventSource.on(event_types.MESSAGE_RECEIVED, onMessageReceived);
    
    console.log('[Reproductive System] Ready! AI will trigger [CONCEPTION_CHECK] tag.');
});
