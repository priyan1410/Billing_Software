import { formatTokenNumber, getNextTokenNumber, normalizeTokenNumber, parseTokenSequence } from './tokenUtils';

const assert = (condition: boolean, message: string) => {
    if (!condition) {
        throw new Error(message);
    }
};

const run = () => {
    assert(normalizeTokenNumber('2') === 'KMKOT002', 'numeric token should normalize to KMKOT002');
    assert(normalizeTokenNumber('KMKOT003') === 'KMKOT003', 'formatted token should remain stable');
    assert(formatTokenNumber(3) === 'KMKOT003', 'format should pad sequence to 3 digits');
    assert(getNextTokenNumber(3) === 'KMKOT004', 'next token should increment from the last issued sequence');
    assert(parseTokenSequence('KMKOT004') === 4, 'sequence parser should extract the numeric part');
};

run();
console.log('tokenUtils tests passed');
