/* ── Indian Government Departments for CivicSync ── */

const DEPARTMENTS = [
    {
        id: "pwd",
        name: "Public Works Department (PWD)",
        icon: "🏗️",
        description: "Roads, bridges, government buildings, and infrastructure maintenance",
        categories: ["Pothole", "Road_Damage", "Bridge_Issue", "Building_Maintenance"],
    },
    {
        id: "water_supply",
        name: "Water Supply & Sewerage Board",
        icon: "💧",
        description: "Water supply, pipelines, sewage systems, and drainage",
        categories: ["Water_Leak", "No_Water", "Sewage_Overflow", "Drainage_Block"],
    },
    {
        id: "municipal",
        name: "Municipal Corporation",
        icon: "🏛️",
        description: "Sanitation, waste management, parks, and urban civic services",
        categories: ["Garbage", "Park_Maintenance", "Encroachment", "Illegal_Construction"],
    },
    {
        id: "electricity",
        name: "Electricity Board (DISCOM)",
        icon: "⚡",
        description: "Power supply, streetlights, transformers, and electrical infrastructure",
        categories: ["Streetlight", "Power_Outage", "Transformer_Issue", "Illegal_Wiring"],
    },
    {
        id: "transport",
        name: "Roads & Transport Department",
        icon: "🚌",
        description: "Public transport, traffic signals, bus stops, and road signage",
        categories: ["Traffic_Signal", "Bus_Stop_Damage", "Missing_Signage", "Road_Marking"],
    },
    {
        id: "health",
        name: "Health & Family Welfare Department",
        icon: "🏥",
        description: "Public hospitals, dispensaries, disease control, and sanitation compliance",
        categories: ["Hospital_Issue", "Disease_Outbreak", "Sanitation_Hazard", "Medical_Emergency"],
    },
    {
        id: "police",
        name: "Police Department",
        icon: "🚔",
        description: "Law and order, traffic management, and public safety",
        categories: ["Safety_Concern", "Traffic_Violation", "Noise_Complaint", "Anti_Social"],
    },
    {
        id: "fire",
        name: "Fire & Emergency Services",
        icon: "🚒",
        description: "Fire safety, hazard inspection, and emergency response",
        categories: ["Fire_Hazard", "Building_Safety", "Emergency_Access_Block"],
    },
    {
        id: "environment",
        name: "Environment & Pollution Control Board",
        icon: "🌿",
        description: "Air/water/noise pollution, industrial waste, and environmental violations",
        categories: ["Air_Pollution", "Water_Pollution", "Noise_Pollution", "Illegal_Dumping"],
    },
    {
        id: "education",
        name: "Education Department",
        icon: "📚",
        description: "Government schools, mid-day meals, and educational infrastructure",
        categories: ["School_Infrastructure", "Mid_Day_Meal", "Teacher_Absence"],
    },
    {
        id: "revenue",
        name: "Revenue & Land Department",
        icon: "📋",
        description: "Land records, property disputes, encroachment on government land",
        categories: ["Land_Encroachment", "Property_Dispute", "Missing_Records"],
    },
    {
        id: "social_welfare",
        name: "Social Welfare Department",
        icon: "🤝",
        description: "Pension schemes, disability assistance, SC/ST welfare, and social justice",
        categories: ["Pension_Issue", "Welfare_Scheme", "Discrimination_Report"],
    },
    {
        id: "food_civil",
        name: "Food & Civil Supplies Department",
        icon: "🍚",
        description: "Ration shops, PDS, food adulteration, and price control",
        categories: ["Ration_Issue", "Price_Violation", "Food_Adulteration"],
    },
    {
        id: "urban_dev",
        name: "Urban Development & Housing",
        icon: "🏘️",
        description: "Town planning, housing schemes, unauthorized construction",
        categories: ["Planning_Violation", "Housing_Scheme", "Building_Permit"],
    },
    {
        id: "telecom",
        name: "Telecom & IT Department",
        icon: "📡",
        description: "Telecom tower issues, internet connectivity, and digital services",
        categories: ["Tower_Issue", "Connectivity", "Digital_Service"],
    },
    {
        id: "forest",
        name: "Forest & Wildlife Department",
        icon: "🌳",
        description: "Tree felling, wildlife issues, and forest encroachment",
        categories: ["Tree_Felling", "Wildlife_Issue", "Forest_Encroachment"],
    },
];

export const ALL_CATEGORIES = DEPARTMENTS.flatMap((d) =>
    d.categories.map((c) => ({ category: c, departmentId: d.id, departmentName: d.name }))
);

export const getCategoryDepartment = (category) => {
    for (const dept of DEPARTMENTS) {
        if (dept.categories.includes(category)) return dept;
    }
    return DEPARTMENTS.find((d) => d.id === "municipal"); // default fallback
};

export const SEVERITY_LEVELS = [
    { value: "Low", label: "Low", color: "#22c55e", threshold: 1 },
    { value: "Medium", label: "Medium", color: "#f59e0b", threshold: 3 },
    { value: "High", label: "High", color: "#f97316", threshold: 10 },
    { value: "Critical", label: "Critical", color: "#ef4444", threshold: 25 },
];

export const TICKET_STATUSES = [
    { value: "Open", label: "Open", color: "#3b82f6" },
    { value: "Assigned", label: "Assigned", color: "#8b5cf6" },
    { value: "In_Progress", label: "In Progress", color: "#f59e0b" },
    { value: "Pending_Verification", label: "Pending Verification", color: "#f97316" },
    { value: "Closed", label: "Closed", color: "#22c55e" },
    { value: "Disputed", label: "Disputed", color: "#ef4444" },
    { value: "Awaiting_Sync", label: "Awaiting Sync", color: "#6b7280" },
    { value: "Invalid_Spam", label: "Invalid/Spam", color: "#9ca3af" },
];

export default DEPARTMENTS;
