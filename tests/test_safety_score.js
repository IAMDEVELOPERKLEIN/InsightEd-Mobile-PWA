
import { calculateRiskIndex } from '../api/utils/safetyScore.js';

const testCases = [
    {
        name: "Low Risk Case",
        data: {
            insurgency_threats_6mo: 0,
            river_crossing_no_bridge: false,
            requires_hiking: false,
            natural_calamities: [],
            near_cliff_ravine: false,
            road_unpaved_pct: 20
        },
        expected: 1
    },
    {
        name: "Moderate Risk (Insurgency)",
        data: {
            insurgency_threats_6mo: 1,
            river_crossing_no_bridge: false,
            requires_hiking: false,
        },
        expected: 4 // 1 base + 3
    },
    {
        name: "High Risk (Insurgency + River + Hiking)",
        data: {
            insurgency_threats_6mo: 2,
            river_crossing_no_bridge: true,
            requires_hiking: true,
            hiking_distance_km: 5
        },
        expected: 9 // 1 + 3 + 2 + 3
    },
    {
        name: "Max Risk (Critical)",
        data: {
            insurgency_threats_6mo: 5,
            river_crossing_no_bridge: true,
            requires_hiking: true,
            hiking_distance_km: 10,
            near_cliff_ravine: true,
            cliff_distance_m: 5,
            weather_isolation: true
        },
        expected: 10 // (1 + 3 + 2 + 3 + 2 + 1.5) = 12.5 -> capped at 10
    }
];

testCases.forEach(tc => {
    const result = calculateRiskIndex(tc.data);
    console.log(`[${tc.name}] Result: ${result} | Expected: ${tc.expected} | ${result === tc.expected ? '✅ PASS' : '❌ FAIL'}`);
});
