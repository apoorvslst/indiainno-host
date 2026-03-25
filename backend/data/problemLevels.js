/**
 * Top 100 Civic Problems — Level Classification
 * 
 * Level 1: Routine (Direct to Junior Engineer / Gramsevak)
 * Level 2: Medium priority (Dept Head / BDO approval, then assign)
 * Level 3: High priority / Emergency (Officer / Commissioner approval)
 * Level 4: Macro / Policy level (Top authority)
 * 
 * Each entry maps a primaryCategory (or subCategory) → level + default severity
 */

const PROBLEM_LEVELS = [
    // ═══ LEVEL 1: Routine & Low Priority (Direct to JE/AE) ═══
    // Roads & Pathways
    { id: 1, category: "Pothole", level: 1, severity: "Low", department: "pwd" },
    { id: 2, category: "Broken_Pavement", level: 1, severity: "Low", department: "pwd" },
    { id: 3, category: "Missing_Manhole_Cover", level: 1, severity: "Medium", department: "pwd" },
    { id: 4, category: "Damaged_Speed_Breaker", level: 1, severity: "Low", department: "pwd" },
    { id: 5, category: "Mud_Silt_On_Road", level: 1, severity: "Low", department: "pwd" },
    { id: 6, category: "Broken_Signage", level: 1, severity: "Low", department: "pwd" },
    { id: 7, category: "Temporary_Encroachment", level: 1, severity: "Low", department: "municipal" },
    { id: 8, category: "Illegal_Road_Cutting", level: 1, severity: "Low", department: "pwd" },
    { id: 9, category: "Faded_Zebra_Crossing", level: 1, severity: "Low", department: "transport" },
    { id: 10, category: "Waterlogging_Puddles", level: 1, severity: "Low", department: "pwd" },
    // Sanitation & Waste
    { id: 11, category: "Overflowing_Garbage_Bin", level: 1, severity: "Low", department: "municipal" },
    { id: 12, category: "Missed_Garbage_Collection", level: 1, severity: "Low", department: "municipal" },
    { id: 13, category: "Dead_Animal_Removal", level: 1, severity: "Medium", department: "municipal" },
    { id: 14, category: "Open_Garbage_Burning", level: 1, severity: "Low", department: "environment" },
    { id: 15, category: "Damaged_Public_Dustbin", level: 1, severity: "Low", department: "municipal" },
    { id: 16, category: "Foul_Smell", level: 1, severity: "Low", department: "municipal" },
    { id: 17, category: "Spitting_Defacement", level: 1, severity: "Low", department: "municipal" },
    { id: 18, category: "Dirty_Public_Toilet", level: 1, severity: "Low", department: "municipal" },
    { id: 19, category: "No_Water_Public_Toilet", level: 1, severity: "Low", department: "water_supply" },
    { id: 20, category: "Unswept_Streets", level: 1, severity: "Low", department: "municipal" },
    // Electrical & Streetlights
    { id: 21, category: "Streetlight", level: 1, severity: "Low", department: "electricity" },
    { id: 22, category: "Flickering_Lights", level: 1, severity: "Low", department: "electricity" },
    { id: 23, category: "Daytime_Streetlights_On", level: 1, severity: "Low", department: "electricity" },
    { id: 24, category: "Broken_Light_Cover", level: 1, severity: "Low", department: "electricity" },
    { id: 25, category: "Illegal_Banners_On_Poles", level: 1, severity: "Low", department: "municipal" },
    // Horticulture & Parks
    { id: 26, category: "Overgrown_Grass", level: 1, severity: "Low", department: "municipal" },
    { id: 27, category: "Broken_Park_Benches", level: 1, severity: "Low", department: "municipal" },
    { id: 28, category: "Broken_Swings", level: 1, severity: "Low", department: "municipal" },
    { id: 29, category: "Malfunctioning_Open_Gym", level: 1, severity: "Low", department: "municipal" },
    { id: 30, category: "Dead_Trees", level: 1, severity: "Medium", department: "forest" },
    { id: 31, category: "Tree_Pruning_Required", level: 1, severity: "Low", department: "forest" },
    { id: 32, category: "Stolen_Park_Gates", level: 1, severity: "Low", department: "municipal" },
    // Health, Water, & Vectors
    { id: 33, category: "Mosquito_Breeding", level: 1, severity: "Medium", department: "health" },
    { id: 34, category: "Stray_Dog_Menace", level: 1, severity: "Medium", department: "municipal" },
    { id: 35, category: "Stray_Cattle", level: 1, severity: "Low", department: "municipal" },
    { id: 36, category: "Drainage_Block", level: 1, severity: "Medium", department: "water_supply" },
    { id: 37, category: "Water_Leak", level: 1, severity: "Medium", department: "water_supply" },
    { id: 38, category: "Dirty_Water_Cooler", level: 1, severity: "Low", department: "health" },
    { id: 39, category: "Park_Maintenance", level: 1, severity: "Low", department: "municipal" },
    { id: 40, category: "Garbage", level: 1, severity: "Low", department: "municipal" },

    // ═══ LEVEL 2: Medium Priority (Dept Head / BDO approval) ═══
    // Civil Infrastructure Upgrades
    { id: 41, category: "Road_Damage", level: 2, severity: "Medium", department: "pwd" },
    { id: 42, category: "Road_Widening", level: 2, severity: "Medium", department: "pwd" },
    { id: 43, category: "New_Pipeline_Laying", level: 2, severity: "Medium", department: "water_supply" },
    { id: 44, category: "Aging_Sewer_Lines", level: 2, severity: "Medium", department: "water_supply" },
    { id: 45, category: "Major_Sinkhole", level: 2, severity: "High", department: "pwd" },
    { id: 46, category: "Community_Hall_Renovation", level: 2, severity: "Low", department: "municipal" },
    { id: 47, category: "Public_Toilet_Construction", level: 2, severity: "Medium", department: "municipal" },
    { id: 48, category: "School_Structural_Repair", level: 2, severity: "Medium", department: "education" },
    { id: 49, category: "Toll_Booth_Upgrade", level: 2, severity: "Low", department: "transport" },
    { id: 50, category: "Parking_Lot_Overhaul", level: 2, severity: "Low", department: "transport" },
    // Systemic Maintenance
    { id: 51, category: "Pre_Monsoon_Desilting", level: 2, severity: "Medium", department: "water_supply" },
    { id: 52, category: "Park_Renovation", level: 2, severity: "Low", department: "municipal" },
    { id: 53, category: "New_Open_Gym_Installation", level: 2, severity: "Low", department: "municipal" },
    { id: 54, category: "Rainwater_Harvesting", level: 2, severity: "Low", department: "water_supply" },
    { id: 55, category: "Vector_Control_Chemicals", level: 2, severity: "Medium", department: "health" },
    { id: 56, category: "Local_Beautification", level: 2, severity: "Low", department: "municipal" },
    { id: 57, category: "Smog_Gun_Deployment", level: 2, severity: "Medium", department: "environment" },
    { id: 58, category: "Waste_Segregation_Center", level: 2, severity: "Medium", department: "municipal" },
    { id: 59, category: "Automated_Sweeping_Tenders", level: 2, severity: "Low", department: "municipal" },
    { id: 60, category: "New_Garbage_Vehicles", level: 2, severity: "Medium", department: "municipal" },
    // Electrical & Technical
    { id: 61, category: "LED_Streetlight_Conversion", level: 2, severity: "Low", department: "electricity" },
    { id: 62, category: "Substation_Upgrade", level: 2, severity: "Medium", department: "electricity" },
    { id: 63, category: "Pedestrian_Subway_Repair", level: 2, severity: "Medium", department: "pwd" },
    { id: 64, category: "Dangerous_Overhead_Wires", level: 2, severity: "High", department: "electricity" },
    { id: 65, category: "Biometric_Attendance_System", level: 2, severity: "Low", department: "municipal" },
    // Enforcement
    { id: 66, category: "Illegal_Construction", level: 2, severity: "Medium", department: "municipal" },
    { id: 67, category: "Property_Sealing", level: 2, severity: "Medium", department: "revenue" },
    { id: 68, category: "Low_Water_Pressure", level: 2, severity: "Medium", department: "water_supply" },
    { id: 69, category: "Stray_Cattle_Capture", level: 2, severity: "Low", department: "municipal" },
    { id: 70, category: "Encroachment", level: 2, severity: "Medium", department: "municipal" },

    // ═══ LEVEL 3: High Priority & Emergency (Officer / Commissioner) ═══
    { id: 71, category: "Building_Collapse", level: 3, severity: "Critical", department: "pwd" },
    { id: 72, category: "Severe_Waterlogging", level: 3, severity: "Critical", department: "pwd" },
    { id: 73, category: "Landfill_Fire", level: 3, severity: "Critical", department: "fire" },
    { id: 74, category: "Bridge_Issue", level: 3, severity: "Critical", department: "pwd" },
    { id: 75, category: "Highway_Sinkhole", level: 3, severity: "Critical", department: "pwd" },
    { id: 76, category: "Trunk_Drain_Breach", level: 3, severity: "Critical", department: "water_supply" },
    { id: 77, category: "Retaining_Wall_Collapse", level: 3, severity: "Critical", department: "pwd" },
    { id: 78, category: "Storm_Damage", level: 3, severity: "Critical", department: "pwd" },
    { id: 79, category: "Industrial_Fire", level: 3, severity: "Critical", department: "fire" },
    { id: 80, category: "Toxic_Gas_Leak", level: 3, severity: "Critical", department: "environment" },
    { id: 81, category: "Epidemic_Outbreak", level: 3, severity: "Critical", department: "health" },
    { id: 82, category: "Hospital_Shortage", level: 3, severity: "Critical", department: "health" },
    { id: 83, category: "Sanitation_Worker_Strike", level: 3, severity: "High", department: "municipal" },
    { id: 84, category: "Water_Contamination", level: 3, severity: "Critical", department: "water_supply" },
    { id: 85, category: "Streetlight_Blackout_Zone", level: 3, severity: "High", department: "electricity" },
    { id: 86, category: "Severe_AQI_Emergency", level: 3, severity: "Critical", department: "environment" },
    { id: 87, category: "Simultaneous_Infrastructure_Failure", level: 3, severity: "Critical", department: "pwd" },
    { id: 88, category: "Corruption_Detected", level: 3, severity: "High", department: "municipal" },
    { id: 89, category: "Major_Demolition_Drive", level: 3, severity: "High", department: "municipal" },
    { id: 90, category: "Unsafe_Factory_Operations", level: 3, severity: "Critical", department: "environment" },

    // ═══ LEVEL 4: Macro / Top Authority (E-in-C / Mayor / SDM) ═══
    { id: 91, category: "Landfill_Capacity_Exhaustion", level: 4, severity: "Critical", department: "municipal" },
    { id: 92, category: "Budget_Deficit", level: 4, severity: "High", department: "revenue" },
    { id: 93, category: "Master_Plan_Implementation", level: 4, severity: "Medium", department: "urban_dev" },
    { id: 94, category: "EV_Transition_Policy", level: 4, severity: "Medium", department: "transport" },
    { id: 95, category: "New_Infrastructure_Project", level: 4, severity: "Medium", department: "urban_dev" },
    { id: 96, category: "Property_Tax_Policy", level: 4, severity: "Medium", department: "revenue" },
    { id: 97, category: "Inter_Agency_Dispute", level: 4, severity: "High", department: "municipal" },
    { id: 98, category: "Administrative_Restructuring", level: 4, severity: "Medium", department: "municipal" },
    { id: 99, category: "Zero_Waste_Strategy", level: 4, severity: "Medium", department: "environment" },
    { id: 100, category: "Smart_City_AI_Integration", level: 4, severity: "Medium", department: "urban_dev" },
    // Extra common aliases from departments.js
    { id: 101, category: "Power_Outage", level: 1, severity: "Medium", department: "electricity" },
    { id: 102, category: "Transformer_Issue", level: 2, severity: "Medium", department: "electricity" },
    { id: 103, category: "Illegal_Wiring", level: 1, severity: "Medium", department: "electricity" },
    { id: 104, category: "No_Water", level: 1, severity: "Medium", department: "water_supply" },
    { id: 105, category: "Sewage_Overflow", level: 2, severity: "High", department: "water_supply" },
    { id: 106, category: "Building_Maintenance", level: 1, severity: "Low", department: "pwd" },
    { id: 107, category: "Road_Resurfacing", level: 2, severity: "Medium", department: "pwd" },
// Fire & Emergency categories from departments.js - CRITICAL - Level 3
{ id: 108, category: "Fire_Hazard", level: 3, severity: "Critical", department: "fire" },
{ id: 109, category: "Building_Safety", level: 3, severity: "High", department: "fire" },
{ id: 110, category: "Emergency_Access_Block", level: 3, severity: "Critical", department: "fire" },
{ id: 111, category: "Fire_Safety_Violation", level: 3, severity: "Critical", department: "fire" },
{ id: 112, category: "Electrical_Fire_Risk", level: 3, severity: "Critical", department: "fire" },
{ id: 113, category: "Gas_Leak", level: 3, severity: "Critical", department: "fire" },
{ id: 114, category: "Safety_Concern", level: 2, severity: "High", department: "police" },
];

/**
 * Classify a complaint's level based on its category.
 * Uses fuzzy matching: normalizes underscores/spaces/case.
 * Returns { level, severity, department } or defaults to Level 1.
 */
function classifyProblemLevel(primaryCategory, subCategory) {
    const normalize = (s) => (s || '').toLowerCase().replace(/[\s\-]+/g, '_').trim();
    const catNorm = normalize(primaryCategory);
    const subNorm = normalize(subCategory);

    // Try exact match on primaryCategory first, then subCategory
    let match = PROBLEM_LEVELS.find(p => normalize(p.category) === catNorm);
    if (!match && subNorm) {
        match = PROBLEM_LEVELS.find(p => normalize(p.category) === subNorm);
    }
    // Fuzzy: check if any problem category is contained in the complaint category
    if (!match) {
        match = PROBLEM_LEVELS.find(p => catNorm.includes(normalize(p.category)) || normalize(p.category).includes(catNorm));
    }

return match
    ? { level: match.level, severity: match.severity, department: match.department }
    : { level: 1, severity: 'Low', department: 'municipal' }; // Default to Level 1, municipal
}

module.exports = { PROBLEM_LEVELS, classifyProblemLevel };
