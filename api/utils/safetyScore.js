
/**
 * Calculates a risk index (1-10) based on school location hazard data.
 * @param {Object} data - The school location profile data.
 * @returns {number} - Risk index from 1 to 10.
 */
export const calculateRiskIndex = (data) => {
    let score = 1; // Base score (minimum risk)

    // Significant Risk Factors
    if (data.insurgency_threats_6mo > 0) score += 3;
    if (data.river_crossing_no_bridge === true) score += 2;
    if (data.requires_hiking === true) {
        if (data.hiking_distance_km > 3) score += 3;
        else if (data.hiking_distance_km > 1) score += 1.5;
        else score += 1;
    }

    // Hazard Incidences
    if (data.natural_calamities && Array.isArray(data.natural_calamities)) {
        const totalIncidences = data.natural_calamities.reduce((acc, curr) => acc + (curr.incidences || 0), 0);
        if (totalIncidences > 10) score += 2;
        else if (totalIncidences > 5) score += 1;
    }

    // Proximity to Hazards
    if (data.near_cliff_ravine === true) {
        if (data.cliff_distance_m < 10) score += 2;
        else if (data.cliff_distance_m < 50) score += 1;
    }

    if (data.water_proximity && Array.isArray(data.water_proximity)) {
        const veryClose = data.water_proximity.some(w => w.distance_km < 0.5);
        if (veryClose) score += 1;
    }

    // Infrastructure Factors
    if (data.road_unpaved_pct > 70) score += 1;
    if (data.public_transpo_availability === 1) score += 1; // 1 scale = poor
    if (data.weather_isolation === true) score += 1.5;

    // Emergency Response
    if (data.emergency_response_mins > 60) score += 1;

    // Cap at 10 and round
    return Math.min(10, Math.round(score));
};
