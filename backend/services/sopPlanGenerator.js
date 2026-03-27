/**
 * SOP Plan Generator Service
 * 
 * Integrates with backend_portable (FastAPI) to generate
 * detailed implementation plans using SOPs for road/water repairs.
 * 
 * Usage:
 *   const plan = await generatePlanFromSOP(ticket);
 *   - ticket: MasterTicket object with primaryCategory, description, location, etc.
 */

const axios = require('axios');

const CONFIG = {
    // Backend portable runs on port 8000 by default
    SOP_API_URL: process.env.SOP_API_URL || 'http://localhost:8000',
    TIMEOUT: 120000, // 2 minutes for AI processing
};

// Map our categories to SOP domain hints
const CATEGORY_TO_DOMAIN = {
    'Pothole': 'road',
    'Road_Damage': 'road',
    'Road': 'road',
    'Garbage': 'sanitation',
    'Water_Leak': 'water',
    'No_Water': 'water',
    'Water_Supply': 'water',
    'Sewage_Overflow': 'sanitation',
    'Drainage_Block': 'sanitation',
    'Streetlight': 'electrical',
    'Power_Outage': 'electrical',
    'Fire_Hazard': 'fire',
    'Building_Safety': 'building',
    'Encroachment': 'encroachment',
    'Other': null // Will be auto-detected
};

const SEVERITY_MAP = {
    'Low': 'low',
    'Medium': 'medium',
    'High': 'high',
    'Critical': 'critical'
};

async function generatePlanFromSOP(ticket) {
    const {
        primaryCategory,
        description,
        severity,
        locality,
        landmark,
        zone,
        wardNumber
    } = ticket;

    // Build location string
    const locationParts = [locality, landmark, zone, wardNumber].filter(Boolean);
    const location = locationParts.join(', ') || 'Unknown Location';

    // Determine domain hint
    const domainHint = CATEGORY_TO_DOMAIN[primaryCategory] || null;
    const severityHint = SEVERITY_MAP[severity] || 'medium';

    try {
        console.log(`[SOP Plan] Generating plan for ${primaryCategory} (${domainHint || 'auto-detect'}) at ${location}`);

        const response = await axios.post(
            `${CONFIG.SOP_API_URL}/api/generate-plan`,
            {
                complaint_text: description,
                domain: domainHint,
                severity: severityHint,
                location: location
            },
            {
                timeout: CONFIG.TIMEOUT,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.success) {
            const planData = response.data.plan;
            console.log(`[SOP Plan] Generated successfully in ${response.data.processing_time}s`);
            
            return {
                success: true,
                plan: transformSOPPlanToImplementation(planData, ticket),
                processingTime: response.data.processing_time,
                rawPlan: planData
            };
        } else {
            console.error(`[SOP Plan] Generation failed: ${response.data.error}`);
            return {
                success: false,
                error: response.data.error
            };
        }

    } catch (err) {
        const errorMsg = err.response?.data?.detail || err.message;
        console.error(`[SOP Plan] API error: ${errorMsg}`);
        return {
            success: false,
            error: errorMsg
        };
    }
}

function transformSOPPlanToImplementation(sopPlan, ticket) {
    // Transform SOP plan format to our ImplementationPlan format
    const phases = sopPlan.phases || [];
    
    // Convert SOP phases to steps
    const steps = [];
    let stepNumber = 1;
    
    phases.forEach(phase => {
        const tasks = phase.tasks || [];
        tasks.forEach(task => {
            steps.push({
                stepNumber: stepNumber++,
                title: task.name || task.description?.substring(0, 50) || `Phase ${phase.phase_number}: ${phase.phase_name}`,
                description: task.description || '',
                estimatedHours: parseFloat(task.duration_hours || task.estimated_hours || 4),
                estimatedCost: 0,
                requiredMaterials: task.materials || [],
                requiredEquipment: task.equipment || [],
                requiredPersonnel: task.personnel || [],
                safetyPrecautions: phase.safety_requirements || [],
                status: 'pending'
            });
        });
    });

    // Calculate total hours and cost
    const totalEstimatedHours = steps.reduce((sum, s) => sum + (s.estimatedHours || 0), 0);
    const totalEstimatedCost = sopPlan.total_estimated_cost_inr || 
        (sopPlan.phases?.reduce((sum, p) => sum + (p.estimated_cost || 0), 0) || 0);

    // Extract materials and equipment from all phases
    const allMaterials = [];
    const allEquipment = [];
    
    phases.forEach(phase => {
        if (phase.materials) {
            phase.materials.forEach(m => {
                if (!allMaterials.find(existing => existing.name === m.name)) {
                    allMaterials.push({
                        name: m.name,
                        quantity: m.quantity || 'As required',
                        estimatedCost: parseFloat(m.cost_inr || m.estimated_cost || 0)
                    });
                }
            });
        }
        if (phase.equipment) {
            phase.equipment.forEach(e => {
                if (!allEquipment.includes(e)) {
                    allEquipment.push(e);
                }
            });
        }
    });

    return {
        masterTicketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        category: ticket.primaryCategory,
        subCategory: ticket.subCategory || '',
        level: ticket.level || 1,
        severity: ticket.severity || 'Low',
        department: ticket.department || 'municipal',
        zone: ticket.zone || '',
        wardNumber: ticket.wardNumber || '',
        locality: ticket.locality || '',
        landmark: ticket.landmark || '',
        
        // SOP-generated content
        title: `${ticket.primaryCategory?.replace(/_/g, ' ')} - Implementation Plan`,
        description: sopPlan.complaint?.raw_text || ticket.description,
        problemAnalysis: sopPlan.triage?.justification || `Analysis of ${ticket.primaryCategory} issue requiring immediate attention.`,
        
        steps: steps,
        totalEstimatedHours: totalEstimatedHours,
        totalEstimatedCost: totalEstimatedCost,
        
        primaryMaterials: allMaterials,
        primaryEquipment: allEquipment,
        
        // Workflow state
        currentStage: 'ai_generated',
        status: 'draft',
        
        // AI metadata
        aiGeneratedAt: new Date(),
        aiGeneratedBy: 'CivicSync AI (SOP Engine)',
        
        // Triage info from SOP
        sopTriage: {
            classification: sopPlan.triage?.classification || 'Infrastructure Issue',
            crewSize: sopPlan.triage?.estimated_crew_size || 4,
            urgencyHours: sopPlan.triage?.urgency_hours || 48,
            escalationRequired: sopPlan.triage?.escalation_required || false
        },
        
        // Quality assurance from SOP
        qualityAssurance: sopPlan.quality_assurance || {},
        
        // Weather context
        weatherContext: sopPlan.weather_context || {},
        
        // SOP references
        sopReferences: sopPlan.sop_references || [],
        
        // Approval history
        approvalHistory: [{
            action: 'ai_generated',
            performedBy: null,
            performedByRole: 'ai',
            remarks: `AI-generated implementation plan using SOP engine for ${ticket.primaryCategory}`,
            timestamp: new Date()
        }]
    };
}

async function checkSOPServiceHealth() {
    try {
        const response = await axios.get(`${CONFIG.SOP_API_URL}/api/health`, { timeout: 5000 });
        return {
            running: true,
            groqConfigured: response.data.groq_key_set,
            status: response.data
        };
    } catch (err) {
        return {
            running: false,
            groqConfigured: false,
            error: err.message
        };
    }
}

async function checkVectorStoreStatus() {
    try {
        const response = await axios.get(`${CONFIG.SOP_API_URL}/api/vector-store-status`, { timeout: 5000 });
        return response.data;
    } catch (err) {
        return {
            status: 'error',
            error: err.message
        };
    }
}

module.exports = {
    generatePlanFromSOP,
    checkSOPServiceHealth,
    checkVectorStoreStatus,
    CATEGORY_TO_DOMAIN
};
