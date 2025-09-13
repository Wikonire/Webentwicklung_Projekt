export function isLngLat(candidate) {
    return (
        Array.isArray(candidate) &&
        candidate.length === 2 &&
        Number.isFinite(Number(candidate[0])) &&
        Number.isFinite(Number(candidate[1]))
    );
}

export function normalizeLngLat(coordPair) {
    return [Number(coordPair[0]), Number(coordPair[1])];
}

export const toNumber = (value) =>
    value === undefined ? undefined : Number(value);

export const clampNumber = (value, min, max) =>
    Math.min(max, Math.max(min, value));

export function isValidCoord(coord) {
    return Array.isArray(coord)
        && coord.length === 2
        && coord[0] >= -180 && coord[0] <= 180
        && coord[1] >= -90 && coord[1] <= 90;
}
