/**
 * HARDCODED IMPLEMENTATION PLAN TEMPLATES
 * 
 * These are AI-generated implementation plans for common civic problems.
 * In production, these will be dynamically generated using Groq LLM
 * with past 30 years of historical data.
 * 
 * Categories covered:
 * 1. Pothole / Road Damage
 * 2. Garbage / Waste Management
 * 3. Water Leak / Supply Issue
 * 4. Sewage / Drainage Block
 * 5. Streetlight / Power Issue
 * 6. Fire Hazard
 * 7. Building Safety
 * 8. Encroachment
 */

const IMPLEMENTATION_PLAN_TEMPLATES = {

  // ═══════════════════════════════════════════════════════════════════
  // 1. POTHOLES & ROAD DAMAGE
  // ═══════════════════════════════════════════════════════════════════
  Pothole: {
    title: "Road Surface Repair & Pothole Filling Implementation Plan",
    description: "Comprehensive road repair work to fill potholes and restore road surface to safe condition for vehicular and pedestrian traffic.",
    problemAnalysis: "Potholes are caused by water infiltration, heavy traffic, temperature changes, and aging asphalt. Left unaddressed, they cause vehicle damage, accidents, and further road deterioration.",
    estimatedHours: 24,
    estimatedCost: 15000,
    materials: [
      { name: "Cold Mix Asphalt", quantity: "2-3 tons per 10 sq.m", estimatedCost: 8000 },
      { name: "Primer/Bitumen Emulsion", quantity: "20 liters", estimatedCost: 1500 },
      { name: "Crack Sealant", quantity: "10 kg", estimatedCost: 1000 },
      { name: "Sand", quantity: "500 kg", estimatedCost: 500 }
    ],
    equipment: ["Road Roller", "Pneumatic Breaker", "Air Compressor", "Asphalt Mixer", "Safety Barricades", "Traffic Cones"],
    personnel: ["Site Supervisor", "Skilled Mason (2)", "Helper (3)", "Traffic Controller"],
    safetyPrecautions: [
      "Wear high-visibility vests and safety helmets",
      "Set up traffic diversion 50m before work area",
      "Ensure proper drainage before filling",
      "Work during low-traffic hours (10 AM - 4 PM)",
      "Use dust suppression measures"
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Site Inspection & Assessment",
        description: "Inspect the pothole to determine extent of damage, underlying causes, and required repair method.",
        estimatedHours: 2,
        status: "pending"
      },
      {
        stepNumber: 2,
        title: "Traffic Management Setup",
        description: "Install safety barricades, traffic cones, and diversion signs. Deploy traffic controller if needed.",
        estimatedHours: 1,
        status: "pending"
      },
      {
        stepNumber: 3,
        title: "Pothole Preparation",
        description: "Clean debris, water, and loose material from pothole. Square up edges and create vertical sides for better bonding.",
        estimatedHours: 3,
        status: "pending"
      },
      {
        stepNumber: 4,
        title: "Base Repair & Compaction",
        description: "Repair any base layer damage, fill with aggregate if needed, and compact the base properly.",
        estimatedHours: 4,
        status: "pending"
      },
      {
        stepNumber: 5,
        title: "Prime Coat Application",
        description: "Apply bitumen emulsion primer to edges and base for better adhesion of the repair material.",
        estimatedHours: 1,
        status: "pending"
      },
      {
        stepNumber: 6,
        title: "Asphalt Filling & Compaction",
        description: "Fill pothole with cold/warm mix asphalt in layers. Compact each layer using road roller. Slight overfill to account for settling.",
        estimatedHours: 4,
        status: "pending"
      },
      {
        stepNumber: 7,
        title: "Surface Finishing",
        description: "Level the surface to match surrounding road. Apply sealant to edges to prevent water seepage.",
        estimatedHours: 2,
        status: "pending"
      },
      {
        stepNumber: 8,
        title: "Curing & Traffic Restoration",
        description: "Allow proper curing time (2-4 hours for cold mix). Remove barricades and restore traffic flow.",
        estimatedHours: 3,
        status: "pending"
      },
      {
        stepNumber: 9,
        title: "Site Cleanup & Documentation",
        description: "Clean up work area, remove debris. Take after photos. Update ticket with completion details.",
        estimatedHours: 2,
        status: "pending"
      },
      {
        stepNumber: 10,
        title: "Quality Check & Handover",
        description: "Final inspection by supervisor. Verify surface smoothness and proper drainage. Hand over to maintenance.",
        estimatedHours: 2,
        status: "pending"
      }
    ]
  },

  Road_Damage: {
    title: "Major Road Damage Repair Implementation Plan",
    description: "Extensive road repair work for significant surface damage affecting large areas of the road.",
    problemAnalysis: "Major road damage indicates structural failure requiring deeper investigation and comprehensive repair methodology.",
    estimatedHours: 72,
    estimatedCost: 50000,
    materials: [
      { name: "Hot Mix Asphalt", quantity: "5-10 tons", estimatedCost: 25000 },
      { name: "WBM Base Material", quantity: "3 tons", estimatedCost: 8000 },
      { name: "Bitumen Emulsion", quantity: "50 liters", estimatedCost: 3000 },
      { name: "Geotextile Membrane", quantity: "20 sq.m", estimatedCost: 4000 }
    ],
    equipment: ["Road Roller", "Paver Machine", "Pneumatic Breaker", "Excavator", "Water Tanker", "Safety Barricades"],
    personnel: ["Site Engineer", "Supervisor", "Skilled Workers (4)", "Helpers (6)", "Traffic Police Liaison"],
    safetyPrecautions: [
      "Full road closure with alternate route notification",
      "Safety barriers 100m before work zone",
      "Night work with proper lighting",
      "Dust and noise control measures",
      "Emergency vehicle access maintained"
    ],
    steps: [
      { stepNumber: 1, title: "Detailed Site Survey", description: "Conduct thorough survey to assess extent of damage, soil condition, and drainage issues.", estimatedHours: 4, status: "pending" },
      { stepNumber: 2, title: "Traffic Diversion Plan", description: "Implement comprehensive traffic management with alternate routes and public notifications.", estimatedHours: 4, status: "pending" },
      { stepNumber: 3, title: "Excavation & Removal", description: "Remove damaged surface and base layers. Excavate to stable foundation.", estimatedHours: 12, status: "pending" },
      { stepNumber: 4, title: "Sub-grade Preparation", description: "Prepare and compact sub-grade. Address drainage issues. Install geotextile if needed.", estimatedHours: 12, status: "pending" },
      { stepNumber: 5, title: "Base Layer Construction", description: "Lay and compact WBM base in layers. Proper grading for drainage.", estimatedHours: 12, status: "pending" },
      { stepNumber: 6, title: "Tack Coat Application", description: "Apply tack coat for bonding between base and surface layers.", estimatedHours: 4, status: "pending" },
      { stepNumber: 7, title: "Asphalt Laying", description: "Lay hot mix asphalt using paver. Ensure proper thickness and slope.", estimatedHours: 8, status: "pending" },
      { stepNumber: 8, title: "Rolling & Compaction", description: "Multi-stage rolling with different roller types for optimal compaction.", estimatedHours: 6, status: "pending" },
      { stepNumber: 9, title: "Joint Sealing & Finishing", description: "Seal joints with existing road surface. Line marking restoration.", estimatedHours: 4, status: "pending" },
      { stepNumber: 10, title: "Curing & Opening", description: "Allow proper cooling. Quality testing. Gradual traffic opening.", estimatedHours: 6, status: "pending" }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════
  // 2. GARBAGE & WASTE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════
  Garbage: {
    title: "Garbage Clearance & Waste Management Implementation Plan",
    description: "Immediate garbage removal and implementation of sustainable waste management practices for the area.",
    problemAnalysis: "Accumulated garbage causes health hazards, attracts pests, creates foul odor, and pollutes the environment. Requires immediate clearance and preventive measures.",
    estimatedHours: 12,
    estimatedCost: 8000,
    materials: [
      { name: "Large Garbage Bags", quantity: "50 pcs", estimatedCost: 1000 },
      { name: "Disinfectant Solution", quantity: "20 liters", estimatedCost: 1500 },
      { name: "Bleaching Powder", quantity: "10 kg", estimatedCost: 500 },
      { name: "PPE Kits", quantity: "5 sets", estimatedCost: 1500 }
    ],
    equipment: ["JCB/Excavator (if large dump)", "Tipper Truck", "Pressure Washer", "Spray Machine", "Rakes & Shovels", "Wheelbarrows"],
    personnel: ["Sanitation Supervisor", "Sanitation Workers (5)", "Driver (2)", "Community Liaison"],
    safetyPrecautions: [
      "Wear full PPE including masks and gloves",
      "Handle hazardous waste separately",
      "Disinfect area before and after clearance",
      "Avoid burning garbage - use proper disposal",
      "Coordinate with waste processing facility"
    ],
    steps: [
      { stepNumber: 1, title: "Site Assessment & Segregation", description: "Assess garbage volume, identify hazardous materials. Plan segregation strategy.", estimatedHours: 2, status: "pending" },
      { stepNumber: 2, title: "Deploy Resources & Team", description: "Arrange vehicles, equipment, and workers. Brief team on safety protocols.", estimatedHours: 1, status: "pending" },
      { stepNumber: 3, title: "Area Disinfection", description: "Spray disinfectant over garbage area to control odor and pathogens.", estimatedHours: 1, status: "pending" },
      { stepNumber: 4, title: "Garbage Collection & Segregation", description: "Collect garbage manually and mechanically. Segregate recyclables, organic, and hazardous waste.", estimatedHours: 4, status: "pending" },
      { stepNumber: 5, title: "Loading & Transportation", description: "Load segregated waste into appropriate vehicles. Transport to designated facilities.", estimatedHours: 2, status: "pending" },
      { stepNumber: 6, title: "Site Deep Cleaning", description: "Clean the area thoroughly using pressure washer. Remove any stains and residues.", estimatedHours: 2, status: "pending" },
      { stepNumber: 7, title: "Final Disinfection", description: "Apply bleaching powder and disinfectant. Allow proper drying.", estimatedHours: 1, status: "pending" },
      { stepNumber: 8, title: "Dustbin Installation", description: "Install garbage bins at strategic locations. Put up awareness signage.", estimatedHours: 2, status: "pending" },
      { stepNumber: 9, title: "Community Awareness", description: "Conduct awareness session for residents on waste segregation and disposal.", estimatedHours: 2, status: "pending" },
      { stepNumber: 10, title: "Documentation & Follow-up", description: "Document before/after photos. Schedule regular collection. Update ticket.", estimatedHours: 1, status: "pending" }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════
  // 3. WATER LEAK / SUPPLY ISSUE
  // ═══════════════════════════════════════════════════════════════════
  Water_Leak: {
    title: "Water Pipeline Leak Repair Implementation Plan",
    description: "Detection and repair of water pipeline leaks to prevent water wastage and road damage.",
    problemAnalysis: "Water leaks waste precious resources, cause road damage, create waterlogging, and may lead to contamination. Quick repair is essential.",
    estimatedHours: 16,
    estimatedCost: 12000,
    materials: [
      { name: "Pipe Clamps", quantity: "Various sizes", estimatedCost: 2000 },
      { name: "HDPE Pipe Section", quantity: "As required", estimatedCost: 4000 },
      { name: "Coupling Joints", quantity: "2-4 pcs", estimatedCost: 1500 },
      { name: "Sand & Gravel", quantity: "1 truck", estimatedCost: 2000 }
    ],
    equipment: ["Leak Detector", "Excavator", "Pump for Dewatering", "Pipe Wrenches", "Compactor", "Safety Gear"],
    personnel: ["Water Works Engineer", "Plumber (2)", "Excavator Operator", "Helpers (3)"],
    safetyPrecautions: [
      "Shut off water supply before excavation",
      "Ensure proper shoring for deep excavations",
      "Use dewatering pumps for waterlogged pits",
      "Coordinate with traffic for road digging",
      "Test water quality after repair"
    ],
    steps: [
      { stepNumber: 1, title: "Leak Detection & Marking", description: "Use leak detection equipment to pinpoint exact leak location. Mark excavation area.", estimatedHours: 2, status: "pending" },
      { stepNumber: 2, title: "Water Shutdown Notification", description: "Notify affected residents. Shut off water supply to affected section.", estimatedHours: 1, status: "pending" },
      { stepNumber: 3, title: "Excavation & Exposure", description: "Dig carefully to expose pipe. Use pumps for dewatering if needed.", estimatedHours: 4, status: "pending" },
      { stepNumber: 4, title: "Leak Assessment", description: "Clean pipe surface. Assess damage extent and determine repair method.", estimatedHours: 1, status: "pending" },
      { stepNumber: 5, title: "Pipe Repair/Replacement", description: "Repair leak using clamps or replace damaged section. Secure all joints properly.", estimatedHours: 3, status: "pending" },
      { stepNumber: 6, title: "Pressure Testing", description: "Conduct pressure test to ensure repair integrity. Check for any additional leaks.", estimatedHours: 2, status: "pending" },
      { stepNumber: 7, title: "Backfilling & Compaction", description: "Carefully backfill with sand around pipe first. Compact in layers.", estimatedHours: 3, status: "pending" },
      { stepNumber: 8, title: "Surface Restoration", description: "Restore road surface or pavement to original condition.", estimatedHours: 3, status: "pending" },
      { stepNumber: 9, title: "Water Supply Restoration", description: "Gradually restore water supply. Flush lines if needed. Test water quality.", estimatedHours: 2, status: "pending" },
      { stepNumber: 10, title: "Site Cleanup & Documentation", description: "Clean work area. Update records. Document repair for future reference.", estimatedHours: 2, status: "pending" }
    ]
  },

  No_Water: {
    title: "Water Supply Restoration Implementation Plan",
    description: "Investigation and restoration of disrupted water supply to affected area.",
    problemAnalysis: "Water supply disruption may be due to pipeline damage, pump failure, valve issues, or supply shortage. Requires systematic troubleshooting.",
    estimatedHours: 24,
    estimatedCost: 20000,
    materials: [
      { name: "Pipeline Sections", quantity: "As required", estimatedCost: 8000 },
      { name: "Valves", quantity: "Various", estimatedCost: 3000 },
      { name: "Gaskets & Seals", quantity: "Multiple", estimatedCost: 1000 },
      { name: "Disinfectant", quantity: "10 liters", estimatedCost: 500 }
    ],
    equipment: ["Pipe Locator", "Excavator", "Pumps", "Valve Keys", "Testing Equipment", "Water Tankers"],
    personnel: ["Water Works Supervisor", "Plumbers (3)", "Equipment Operators", "Water Quality Tester"],
    safetyPrecautions: [
      "Provide alternative water supply via tankers",
      "Coordinate with residents on timeline",
      "Ensure proper sanitation after repair",
      "Test water quality before supply restoration",
      "Document all work for maintenance records"
    ],
    steps: [
      { stepNumber: 1, title: "Supply Status Check", description: "Check main supply line, reservoir levels, and pumping stations. Identify bottleneck.", estimatedHours: 3, status: "pending" },
      { stepNumber: 2, title: "Emergency Water Supply", description: "Deploy water tankers to affected area for immediate relief.", estimatedHours: 2, status: "pending" },
      { stepNumber: 3, title: "Pipeline Inspection", description: "Inspect distribution network for leaks, blockages, or valve issues.", estimatedHours: 4, status: "pending" },
      { stepNumber: 4, title: "Fault Identification", description: "Use pipe locator and pressure testing to identify exact fault location.", estimatedHours: 3, status: "pending" },
      { stepNumber: 5, title: "Repair/Replacement Work", description: "Execute necessary repairs - pipe replacement, valve repair, or pump maintenance.", estimatedHours: 6, status: "pending" },
      { stepNumber: 6, title: "System Flushing", description: "Flush entire affected section to remove debris and sediments.", estimatedHours: 2, status: "pending" },
      { stepNumber: 7, title: "Water Quality Testing", description: "Test water samples for safety parameters before supply restoration.", estimatedHours: 2, status: "pending" },
      { stepNumber: 8, title: "Supply Restoration", description: "Gradually restore supply section by section. Monitor pressure levels.", estimatedHours: 3, status: "pending" },
      { stepNumber: 9, title: "Resident Notification", description: "Inform residents of supply restoration. Advise on first-use precautions.", estimatedHours: 1, status: "pending" },
      { stepNumber: 10, title: "Follow-up & Documentation", description: "Monitor supply stability for 24 hours. Document all work done.", estimatedHours: 2, status: "pending" }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════
  // 4. SEWAGE / DRAINAGE
  // ═══════════════════════════════════════════════════════════════════
  Sewage_Overflow: {
    title: "Sewage Overflow Management & Drain Cleaning Implementation Plan",
    description: "Immediate containment of sewage overflow and comprehensive drain cleaning to prevent health hazards.",
    problemAnalysis: "Sewage overflow poses serious health risks, contaminates water sources, and causes environmental damage. Requires immediate action and thorough cleaning.",
    estimatedHours: 20,
    estimatedCost: 18000,
    materials: [
      { name: "Disinfectant", quantity: "50 liters", estimatedCost: 4000 },
      { name: "Bleaching Powder", quantity: "25 kg", estimatedCost: 1500 },
      { name: "Sand Bags", quantity: "50 bags", estimatedCost: 2000 },
      { name: "Safety Equipment", quantity: "Full set", estimatedCost: 3000 }
    ],
    equipment: ["Suction Truck", "Jetting Machine", "Buckets & Shovels", "Protective Gear", "Barricades", "Warning Signs"],
    personnel: ["Sanitation Inspector", "Sanitation Workers (6)", "Suction Truck Operator", "Health Worker"],
    safetyPrecautions: [
      "Full PPE including respirators mandatory",
      "Vaccination against hepatitis and tetanus",
      "Isolate contaminated area immediately",
      "No eating/drinking in work area",
      "Proper handwashing and decontamination"
    ],
    steps: [
      { stepNumber: 1, title: "Emergency Containment", description: "Isolate affected area with barricades. Deploy sandbags to contain spread.", estimatedHours: 2, status: "pending" },
      { stepNumber: 2, title: "Public Health Warning", description: "Issue advisory to residents. Distribute safety guidelines.", estimatedHours: 1, status: "pending" },
      { stepNumber: 3, title: "Sewage Pumping", description: "Use suction truck to remove standing sewage. Transport to treatment facility.", estimatedHours: 4, status: "pending" },
      { stepNumber: 4, title: "Blockage Removal", description: "Use jetting machine to clear drain blockage. Inspect with camera if needed.", estimatedHours: 4, status: "pending" },
      { stepNumber: 5, title: "Manual Cleaning", description: "Remove debris, sludge, and blockages manually where machines can't reach.", estimatedHours: 3, status: "pending" },
      { stepNumber: 6, title: "Area Washing", description: "Thorough washing of affected area with water and disinfectant solution.", estimatedHours: 2, status: "pending" },
      { stepNumber: 7, title: "Disinfection", description: "Apply bleaching powder and strong disinfectant. Allow proper contact time.", estimatedHours: 2, status: "pending" },
      { stepNumber: 8, title: "Structural Repair", description: "Repair any damaged drain covers, pipes, or manholes.", estimatedHours: 3, status: "pending" },
      { stepNumber: 9, title: "Final Inspection", description: "Verify proper drainage flow. Check for any residual contamination.", estimatedHours: 1, status: "pending" },
      { stepNumber: 10, title: "Documentation & Monitoring", description: "Document work done. Schedule follow-up checks for 7 days.", estimatedHours: 2, status: "pending" }
    ]
  },

  Drainage_Block: {
    title: "Storm Water Drain Cleaning Implementation Plan",
    description: "Clearing of blocked storm water drains to prevent waterlogging during rains.",
    problemAnalysis: "Blocked drains cause water accumulation leading to flooding, breeding of mosquitoes, and damage to roads and buildings.",
    estimatedHours: 16,
    estimatedCost: 12000,
    materials: [
      { name: "Debris Bags", quantity: "100 pcs", estimatedCost: 1000 },
      { name: "Disinfectant", quantity: "20 liters", estimatedCost: 1500 },
      { name: "Grating Covers", quantity: "As needed", estimatedCost: 2000 }
    ],
    equipment: ["Excavator", "Suction Machine", "Jetting Machine", "Manual Tools", "Safety Gear"],
    personnel: ["Drainage Supervisor", "Workers (5)", "Equipment Operators"],
    safetyPrecautions: [
      "Check weather forecast - avoid work during heavy rain",
      "Use confined space protocols for deep drains",
      "Maintain emergency rescue equipment",
      "Proper ventilation in enclosed spaces"
    ],
    steps: [
      { stepNumber: 1, title: "Blockage Assessment", description: "Identify blockage location and extent. Determine cleaning method.", estimatedHours: 2, status: "pending" },
      { stepNumber: 2, title: "Safety Setup", description: "Deploy barricades and warning signs. Brief team on safety.", estimatedHours: 1, status: "pending" },
      { stepNumber: 3, title: "Surface Debris Removal", description: "Remove leaves, plastic, and debris from drain inlets and grates.", estimatedHours: 3, status: "pending" },
      { stepNumber: 4, title: "Mechanical Cleaning", description: "Use jetting machine and suction equipment for deep cleaning.", estimatedHours: 4, status: "pending" },
      { stepNumber: 5, title: "Manual Cleaning", description: "Manual removal of stubborn blockages and sediment buildup.", estimatedHours: 3, status: "pending" },
      { stepNumber: 6, title: "Disinfection", description: "Apply disinfectant to eliminate odor and pathogens.", estimatedHours: 1, status: "pending" },
      { stepNumber: 7, title: "Structural Check", description: "Inspect drain structure for damage. Repair grates and covers.", estimatedHours: 2, status: "pending" },
      { stepNumber: 8, title: "Flow Testing", description: "Test water flow through drain. Verify proper drainage.", estimatedHours: 1, status: "pending" },
      { stepNumber: 9, title: "Area Restoration", description: "Clean up work area. Restore any disturbed surfaces.", estimatedHours: 2, status: "pending" },
      { stepNumber: 10, title: "Documentation", description: "Record work done. Update maintenance schedule.", estimatedHours: 1, status: "pending" }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════
  // 5. STREETLIGHT / POWER
  // ═══════════════════════════════════════════════════════════════════
  Streetlight: {
    title: "Street Light Repair & Maintenance Implementation Plan",
    description: "Repair or replacement of non-functioning street lights to restore area lighting.",
    problemAnalysis: "Non-functioning streetlights create safety hazards for pedestrians and vehicles, increase crime risk, and reduce visibility at night.",
    estimatedHours: 6,
    estimatedCost: 5000,
    materials: [
      { name: "LED Lamp/Bulb", quantity: "As required", estimatedCost: 1500 },
      { name: "Fixture/Holder", quantity: "If needed", estimatedCost: 500 },
      { name: "Wire/Cable", quantity: "As required", estimatedCost: 500 },
      { name: "Fuse/MCB", quantity: "2-3 pcs", estimatedCost: 200 }
    ],
    equipment: ["Ladder/Lift Platform", "Multimeter", "Wire Strippers", "Insulated Tools", "Safety Harness"],
    personnel: ["Electrician (2)", "Helper", "Vehicle Operator"],
    safetyPrecautions: [
      "Disconnect power before any work",
      "Use insulated tools only",
      "Work in pairs - never alone",
      "Use proper ladder/platform safety",
      "Test circuit before touching"
    ],
    steps: [
      { stepNumber: 1, title: "Safety Preparation", description: "Coordinate with electricity department. Ensure power isolation. Set up safety perimeter.", estimatedHours: 1, status: "pending" },
      { stepNumber: 2, title: "Fault Diagnosis", description: "Use multimeter to identify fault - lamp, fixture, wiring, or connection.", estimatedHours: 1, status: "pending" },
      { stepNumber: 3, title: "Lamp Replacement", description: "Replace faulty lamp with new LED bulb. Check compatibility.", estimatedHours: 1, status: "pending" },
      { stepNumber: 4, title: "Wiring Repair", description: "Repair or replace damaged wiring. Ensure proper insulation.", estimatedHours: 1, status: "pending" },
      { stepNumber: 5, title: "Fixture Maintenance", description: "Clean fixture. Check holder and connections. Replace if damaged.", estimatedHours: 1, status: "pending" },
      { stepNumber: 6, title: "Power Restoration & Test", description: "Restore power. Test light operation. Check for flickering.", estimatedHours: 1, status: "pending" }
    ]
  },

  Power_Outage: {
    title: "Power Supply Restoration Implementation Plan",
    description: "Investigation and restoration of electrical power supply to affected area.",
    problemAnalysis: "Power outages disrupt daily life, affect medical equipment, cause food spoilage, and impact businesses. Requires immediate attention.",
    estimatedHours: 12,
    estimatedCost: 15000,
    materials: [
      { name: "Cables", quantity: "As required", estimatedCost: 5000 },
      { name: "Transformer Oil", quantity: "If needed", estimatedCost: 2000 },
      { name: "Fuses/Breakers", quantity: "Multiple", estimatedCost: 1000 }
    ],
    equipment: ["Boom Truck", "Testing Equipment", "Safety Gear", "Generators"],
    personnel: ["Electrical Engineer", "Linesmen (3)", "Safety Supervisor"],
    safetyPrecautions: [
      "Never work on live circuits",
      "Proper lockout-tagout procedures",
      "Coordinate with power utility",
      "Emergency generator backup ready"
    ],
    steps: [
      { stepNumber: 1, title: "Outage Scope Assessment", description: "Determine affected area. Check if localized or widespread.", estimatedHours: 1, status: "pending" },
      { stepNumber: 2, title: "Fault Location", description: "Patrol lines and check transformers. Identify fault location.", estimatedHours: 3, status: "pending" },
      { stepNumber: 3, title: "Safety Isolation", description: "Isolate fault section. Ensure safe working conditions.", estimatedHours: 1, status: "pending" },
      { stepNumber: 4, title: "Repair Work", description: "Execute repairs - cable replacement, transformer repair, etc.", estimatedHours: 4, status: "pending" },
      { stepNumber: 5, title: "Testing", description: "Test repaired section before energizing. Check all connections.", estimatedHours: 2, status: "pending" },
      { stepNumber: 6, title: "Supply Restoration", description: "Gradually restore supply. Monitor for any issues.", estimatedHours: 1, status: "pending" }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════
  // 6. FIRE HAZARD
  // ═══════════════════════════════════════════════════════════════════
  Fire_Hazard: {
    title: "Fire Hazard Mitigation Implementation Plan",
    description: "Assessment and mitigation of fire hazards to ensure public safety.",
    problemAnalysis: "Fire hazards pose immediate danger to life and property. Requires urgent assessment, evacuation planning, installation of safety equipment, and compliance verification.",
    estimatedHours: 48,
    estimatedCost: 35000,
    materials: [
      { name: "Fire Extinguishers", quantity: "As required", estimatedCost: 8000 },
      { name: "Warning Signage", quantity: "Multiple", estimatedCost: 2000 },
      { name: "Sand Buckets", quantity: "10 sets", estimatedCost: 1000 },
      { name: "Fire Safety Equipment", quantity: "Full kit", estimatedCost: 5000 }
    ],
    equipment: ["Safety Inspection Tools", "Fire Safety Gear", "Clearing Equipment"],
    personnel: ["Fire Safety Officer", "Inspectors (2)", "Maintenance Workers"],
    safetyPrecautions: [
      "Immediate evacuation plan required",
      "No open flames in hazard area",
      "Fire department liaison mandatory",
      "24/7 monitoring during mitigation"
    ],
    steps: [
      { stepNumber: 1, title: "Hazard Assessment", description: "Conduct thorough fire safety audit. Identify all risk factors.", estimatedHours: 4, status: "pending" },
      { stepNumber: 2, title: "Immediate Risk Mitigation", description: "Remove immediate fire hazards - combustibles, open wiring, etc.", estimatedHours: 6, status: "pending" },
      { stepNumber: 3, title: "Safety Equipment Installation", description: "Install fire extinguishers, smoke detectors, and emergency lights.", estimatedHours: 8, status: "pending" },
      { stepNumber: 4, title: "Exit Route Clearance", description: "Ensure all emergency exits are clear and properly marked.", estimatedHours: 4, status: "pending" },
      { stepNumber: 5, title: "Electrical Safety Check", description: "Inspect and repair electrical wiring. Remove overload hazards.", estimatedHours: 6, status: "pending" },
      { stepNumber: 6, title: "Staff Training", description: "Train residents/workers on fire safety and evacuation procedures.", estimatedHours: 4, status: "pending" },
      { stepNumber: 7, title: "Documentation & Signage", description: "Put up fire safety signage. Document all safety measures.", estimatedHours: 3, status: "pending" },
      { stepNumber: 8, title: "Fire Department Review", description: "Request fire department inspection. Address any remaining issues.", estimatedHours: 8, status: "pending" },
      { stepNumber: 9, title: "Follow-up Schedule", description: "Schedule regular fire safety audits. Assign responsibilities.", estimatedHours: 2, status: "pending" },
      { stepNumber: 10, title: "Final Certification", description: "Obtain fire safety compliance certificate. Update records.", estimatedHours: 3, status: "pending" }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════
  // 7. BUILDING SAFETY
  // ═══════════════════════════════════════════════════════════════════
  Building_Safety: {
    title: "Building Structural Safety Implementation Plan",
    description: "Assessment and repair of building structural safety issues.",
    problemAnalysis: "Structural safety issues can lead to collapse, injuries, and fatalities. Requires professional assessment and systematic repair.",
    estimatedHours: 72,
    estimatedCost: 50000,
    materials: [
      { name: "Structural Materials", quantity: "As required", estimatedCost: 20000 },
      { name: "Repair Materials", quantity: "Various", estimatedCost: 10000 },
      { name: "Safety Equipment", quantity: "Full set", estimatedCost: 5000 }
    ],
    equipment: ["Scaffolding", "Inspection Tools", "Repair Equipment", "Safety Gear"],
    personnel: ["Structural Engineer", "Masons (3)", "Helpers (4)", "Safety Supervisor"],
    safetyPrecautions: [
      "Evacuate if structural danger identified",
      "Professional structural assessment mandatory",
      "Use proper scaffolding and fall protection",
      "Regular safety inspections during work"
    ],
    steps: [
      { stepNumber: 1, title: "Initial Assessment", description: "Conduct structural safety assessment. Identify immediate dangers.", estimatedHours: 6, status: "pending" },
      { stepNumber: 2, title: "Emergency Measures", description: "Implement temporary supports if needed. Restrict dangerous areas.", estimatedHours: 8, status: "pending" },
      { stepNumber: 3, title: "Detailed Survey", description: "Comprehensive structural survey. Identify all repair needs.", estimatedHours: 8, status: "pending" },
      { stepNumber: 4, title: "Repair Planning", description: "Develop detailed repair plan with structural engineer.", estimatedHours: 6, status: "pending" },
      { stepNumber: 5, title: "Structural Repairs", description: "Execute structural repairs - walls, beams, foundations.", estimatedHours: 24, status: "pending" },
      { stepNumber: 6, title: "Waterproofing", description: "Address water seepage issues. Apply waterproofing.", estimatedHours: 8, status: "pending" },
      { stepNumber: 7, title: "Final Inspection", description: "Structural engineer final inspection. Safety certification.", estimatedHours: 4, status: "pending" },
      { stepNumber: 8, title: "Documentation", description: "Complete documentation. Update building records.", estimatedHours: 4, status: "pending" }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════
  // 8. ENCROACHMENT
  // ═══════════════════════════════════════════════════════════════════
  Encroachment: {
    title: "Encroachment Removal Implementation Plan",
    description: "Legal and systematic removal of encroachments from public spaces.",
    problemAnalysis: "Encroachments on public land reduce accessibility, create safety hazards, and deprive citizens of public amenities. Requires legal process and systematic execution.",
    estimatedHours: 24,
    estimatedCost: 20000,
    materials: [
      { name: "Barricades", quantity: "20 pcs", estimatedCost: 3000 },
      { name: "Warning Signs", quantity: "10 pcs", estimatedCost: 1000 },
      { name: "Documentation Materials", quantity: "Full set", estimatedCost: 1000 }
    ],
    equipment: ["JCB/Excavator", "Trucks", "Barricades", "Documentation Equipment"],
    personnel: ["Municipal Inspector", "Police Liaison", "Workers (6)", "Documenter"],
    safetyPrecautions: [
      "Legal notice period must be completed",
      "Police presence required for enforcement",
      "Video documentation mandatory",
      "Peaceful execution - avoid confrontation"
    ],
    steps: [
      { stepNumber: 1, title: "Legal Documentation", description: "Verify encroachment status. Prepare legal documentation.", estimatedHours: 4, status: "pending" },
      { stepNumber: 2, title: "Notice Issuance", description: "Issue formal notice to encroachers. Provide deadline for voluntary removal.", estimatedHours: 2, status: "pending" },
      { stepNumber: 3, title: "Notice Period", description: "Allow legal notice period for voluntary compliance.", estimatedHours: 168, status: "pending" },
      { stepNumber: 4, title: "Final Notice", description: "Issue final reminder. Coordinate with police.", estimatedHours: 2, status: "pending" },
      { stepNumber: 5, title: "Enforcement Team Deployment", description: "Deploy enforcement team with police support.", estimatedHours: 2, status: "pending" },
      { stepNumber: 6, title: "Encroachment Removal", description: "Execute removal operation. Document entire process.", estimatedHours: 6, status: "pending" },
      { stepNumber: 7, title: "Area Restoration", description: "Restore public space. Install permanent barriers if needed.", estimatedHours: 4, status: "pending" },
      { stepNumber: 8, title: "Documentation & Filing", description: "Complete all documentation. File police report if needed.", estimatedHours: 2, status: "pending" }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════
  // DEFAULT - OTHER PROBLEMS
  // ═══════════════════════════════════════════════════════════════════
  Other: {
    title: "General Civic Issue Resolution Implementation Plan",
    description: "Standard implementation plan for general civic issues requiring assessment and resolution.",
    problemAnalysis: "General civic issues require individual assessment to determine root cause and appropriate resolution methodology.",
    estimatedHours: 24,
    estimatedCost: 10000,
    materials: [
      { name: "General Repair Materials", quantity: "As required", estimatedCost: 5000 },
      { name: "Safety Equipment", quantity: "Standard set", estimatedCost: 2000 }
    ],
    equipment: ["Standard Repair Tools", "Safety Gear", "Documentation Equipment"],
    personnel: ["Supervisor", "Skilled Worker (2)", "Helper (2)"],
    safetyPrecautions: [
      "Follow standard safety protocols",
      "Use proper PPE",
      "Document all work",
      "Coordinate with relevant department"
    ],
    steps: [
      { stepNumber: 1, title: "Problem Assessment", description: "Detailed assessment of the issue. Determine scope and requirements.", estimatedHours: 3, status: "pending" },
      { stepNumber: 2, title: "Planning", description: "Develop resolution plan. Identify resources and timeline.", estimatedHours: 2, status: "pending" },
      { stepNumber: 3, title: "Resource Mobilization", description: "Arrange materials, equipment, and personnel.", estimatedHours: 3, status: "pending" },
      { stepNumber: 4, title: "Execution - Phase 1", description: "Begin resolution work. Address immediate concerns.", estimatedHours: 6, status: "pending" },
      { stepNumber: 5, title: "Execution - Phase 2", description: "Continue work. Implement complete solution.", estimatedHours: 6, status: "pending" },
      { stepNumber: 6, title: "Quality Check", description: "Verify resolution. Address any remaining issues.", estimatedHours: 2, status: "pending" },
      { stepNumber: 7, title: "Documentation", description: "Complete documentation. Take after photos.", estimatedHours: 2, status: "pending" }
    ]
  }
};

// Map alternate category names
const CATEGORY_ALIASES = {
  'Pothole': 'Pothole',
  'Road_Damage': 'Road_Damage',
  'Bridge_Issue': 'Road_Damage',
  'Garbage': 'Garbage',
  'Garbage_Waste': 'Garbage',
  'Water_Leak': 'Water_Leak',
  'No_Water': 'No_Water',
  'Water_Supply': 'No_Water',
  'Sewage_Overflow': 'Sewage_Overflow',
  'Drainage_Block': 'Drainage_Block',
  'Drainage_Sewage': 'Sewage_Overflow',
  'Streetlight': 'Streetlight',
  'Street_Light': 'Streetlight',
  'Power_Outage': 'Power_Outage',
  'Fire_Hazard': 'Fire_Hazard',
  'Building_Safety': 'Building_Safety',
  'Building_Maintenance': 'Building_Safety',
  'Encroachment': 'Encroachment',
  'Illegal_Construction': 'Encroachment',
  'Safety_Concern': 'Fire_Hazard',
  'Other': 'Other'
};

function getPlanTemplate(category) {
  const normalizedCategory = CATEGORY_ALIASES[category] || 'Other';
  return IMPLEMENTATION_PLAN_TEMPLATES[normalizedCategory] || IMPLEMENTATION_PLAN_TEMPLATES.Other;
}

module.exports = {
  IMPLEMENTATION_PLAN_TEMPLATES,
  CATEGORY_ALIASES,
  getPlanTemplate
};
