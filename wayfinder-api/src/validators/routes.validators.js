const isLon = (x) => Number.isFinite(x) && x >= -180 && x <= 180;
const isLat = (x) => Number.isFinite(x) && x >= -90 && x <= 90;
// TODO Verständlich schreiben, Rückgabewerte true, false
function validateCreateRoute(b) {
    const req = ['userId','startLat','startLng','endLat','endLng','geometry'];
    for (const k of req) if (b[k] === undefined) return `${k} fehlt`;
    if (!isLat(b.startLat) || !isLon(b.startLng) || !isLat(b.endLat) || !isLon(b.endLng))
        return 'Koordinaten ungültig';
    return null;
}

export {validateCreateRoute} ;
