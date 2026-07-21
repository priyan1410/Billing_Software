function normalizeTokenNumber(value) {
    const raw = String(value ?? '').trim().toUpperCase();
    if (!raw) return 'KMKOT001';

    const match = raw.match(/KMKOT[-_ ]?0*(\d+)/);
    if (match) {
        return `KMKOT${String(Number(match[1])).padStart(3, '0')}`;
    }

    const numeric = Number(raw);
    if (!Number.isNaN(numeric)) {
        return `KMKOT${String(numeric).padStart(3, '0')}`;
    }

    return raw;
}

function formatTokenNumber(sequence) {
    return `KMKOT${String(sequence).padStart(3, '0')}`;
}

function parseTokenSequence(tokenNumber) {
    const normalized = normalizeTokenNumber(tokenNumber);
    const match = normalized.match(/KMKOT(\d+)/);
    return match ? Number(match[1]) : 0;
}

function getNextTokenNumber(currentSequence) {
    return formatTokenNumber(currentSequence + 1);
}

module.exports = {
    normalizeTokenNumber,
    formatTokenNumber,
    parseTokenSequence,
    getNextTokenNumber
};
