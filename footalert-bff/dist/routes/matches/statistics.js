function normalizeText(value) {
    if (typeof value !== 'string') {
        return '';
    }
    return value.trim().toLowerCase().replace(/[_-]+/g, ' ');
}
function detectStatisticsPeriod(value) {
    const normalized = normalizeText(value);
    if (!normalized) {
        return null;
    }
    if (/\b(1st|first)\b/.test(normalized)) {
        return 'first';
    }
    if (/\b(2nd|second)\b/.test(normalized)) {
        return 'second';
    }
    return null;
}
function stripPeriodHintFromType(type) {
    const sanitized = type
        .replace(/\(\s*(1st|first|2nd|second)\s*half\s*\)/gi, '')
        .replace(/\b(1st|first)\s*half\b/gi, '')
        .replace(/\b(2nd|second)\s*half\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    return sanitized.length > 0 ? sanitized : type;
}
function hasPeriodHintsInFixtureStatistics(response) {
    return response.some(entry => {
        if (!entry || typeof entry !== 'object') {
            return false;
        }
        const record = entry;
        if (detectStatisticsPeriod(record.period ?? record.half ?? record.label ?? record.type)) {
            return true;
        }
        const statistics = Array.isArray(record.statistics) ? record.statistics : [];
        return statistics.some(stat => {
            if (!stat || typeof stat !== 'object') {
                return false;
            }
            const statRecord = stat;
            return Boolean(detectStatisticsPeriod(statRecord.period ?? statRecord.half ?? statRecord.label ?? statRecord.type));
        });
    });
}
export function filterFixtureStatisticsByPeriod(payload, period) {
    const payloadRecord = payload && typeof payload === 'object' ? payload : {};
    const response = Array.isArray(payloadRecord.response) ? payloadRecord.response : [];
    if (!hasPeriodHintsInFixtureStatistics(response)) {
        return {
            ...payloadRecord,
            response: [],
        };
    }
    const filteredResponse = response
        .map(entry => {
        if (!entry || typeof entry !== 'object') {
            return null;
        }
        const entryRecord = entry;
        const teamPeriod = detectStatisticsPeriod(entryRecord.period ?? entryRecord.half ?? entryRecord.label ?? entryRecord.type);
        if (teamPeriod && teamPeriod !== period) {
            return null;
        }
        const statistics = Array.isArray(entryRecord.statistics) ? entryRecord.statistics : [];
        const filteredStatistics = statistics
            .map(stat => {
            if (!stat || typeof stat !== 'object') {
                return null;
            }
            const statRecord = stat;
            const statPeriod = detectStatisticsPeriod(statRecord.period ?? statRecord.half ?? statRecord.label ?? statRecord.type);
            const effectivePeriod = statPeriod ?? teamPeriod;
            if (effectivePeriod !== period) {
                return null;
            }
            const statType = typeof statRecord.type === 'string'
                ? stripPeriodHintFromType(statRecord.type)
                : statRecord.type;
            return {
                ...statRecord,
                type: statType,
            };
        })
            .filter((stat) => stat !== null);
        if (filteredStatistics.length === 0) {
            return null;
        }
        return {
            ...entryRecord,
            statistics: filteredStatistics,
        };
    })
        .filter((entry) => entry !== null);
    return {
        ...payloadRecord,
        response: filteredResponse,
    };
}
