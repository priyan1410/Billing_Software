export function normalizeTokenNumber(value: string | number): string {
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

export function formatTokenNumber(sequence: number): string {
    return `KMKOT${String(sequence).padStart(3, '0')}`;
}

export function parseTokenSequence(tokenNumber: string | number): number {
    const normalized = normalizeTokenNumber(tokenNumber);
    const match = normalized.match(/KMKOT(\d+)/);
    return match ? Number(match[1]) : 0;
}

export function getNextTokenNumber(currentSequence: number): string {
    return formatTokenNumber(currentSequence + 1);
}
