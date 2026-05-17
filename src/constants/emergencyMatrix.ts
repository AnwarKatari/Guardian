export interface EmergencyNumbers {
  police: string;
  fire: string;
  ambulance: string;
}

export const EMERGENCY_MATRIX: Record<string, EmergencyNumbers> = {
  "GH": { police: "191", fire: "192", ambulance: "193" },
  "US": { police: "911", fire: "911", ambulance: "911" },
  "UK": { police: "999", fire: "999", ambulance: "999" },
  "IN": { police: "100", fire: "101", ambulance: "102" },
  "NG": { police: "199", fire: "112", ambulance: "112" },
  "KE": { police: "999", fire: "999", ambulance: "999" },
  "ZA": { police: "10111", fire: "10111", ambulance: "10177" },
  "CA": { police: "911", fire: "911", ambulance: "911" },
  "AU": { police: "000", fire: "000", ambulance: "000" },
  "DE": { police: "110", fire: "112", ambulance: "112" },
  "FR": { police: "17", fire: "18", ambulance: "15" },
  "IL": { police: "100", fire: "102", ambulance: "101" },
  "JM": { police: "119", fire: "110", ambulance: "110" },
  "PK": { police: "15", fire: "16", ambulance: "115" },
  "AE": { police: "999", fire: "997", ambulance: "998" },
  "ES": { police: "091", fire: "080", ambulance: "061" },
  "IT": { police: "113", fire: "115", ambulance: "118" },
  "JP": { police: "110", fire: "119", ambulance: "119" },
  // Add more as needed...
};

export function getEmergencyNumbers(countryCode: string = "GH"): EmergencyNumbers {
  return EMERGENCY_MATRIX[countryCode] || EMERGENCY_MATRIX["GH"];
}
