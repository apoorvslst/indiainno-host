const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ImplementationPlan = require('../models/ImplementationPlan');
const { MasterTicket } = require('../models/Ticket');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');
const { getPlanTemplate, IMPLEMENTATION_PLAN_TEMPLATES } = require('../data/implementationPlans');

const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

async function generateAIPlan(ticket) {
  const template = getPlanTemplate(ticket.primaryCategory);
  
  const steps = template.steps.map(step => ({
    ...step,
    status: 'pending',
    beforePhotos: [],
    duringPhotos: [],
    afterPhotos: [],
    juniorRemarks: '',
    seniorRemarks: ''
  }));

  const materials = template.materials || [];
  const totalCost = materials.reduce((sum, m) => sum + (m.estimatedCost || 0), 0);

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
    title: template.title,
    description: template.description,
    problemAnalysis: template.problemAnalysis,
    steps: steps,
    totalEstimatedHours: template.estimatedHours,
    totalEstimatedCost: totalCost,
    primaryMaterials: materials,
    primaryEquipment: template.equipment || [],
    currentStage: 'ai_generated',
    status: 'draft',
    aiGeneratedAt: new Date(),
    aiGeneratedBy: 'CivicSync AI',
    approvalHistory: [{
      action: 'ai_generated',
      performedBy: null,
      performedByRole: 'ai',
      remarks: `AI-generated implementation plan for ${ticket.primaryCategory} complaint`,
      timestamp: new Date()
    }]
  };
}

async function enhancePlanWithGroq(ticket, basePlan) {
  try {
    const prompt = `You are a municipal infrastructure planning expert for India.
Analyze this complaint and enhance the implementation plan:

COMPLAINT DETAILS:
- Category: ${ticket.primaryCategory}
- Description: ${ticket.description}
- Location: ${ticket.locality || ticket.landmark || 'Not specified'}
- Severity: ${ticket.severity}
- Department: ${ticket.department}

BASE IMPLEMENTATION PLAN:
${JSON.stringify(basePlan.steps, null, 2)}

Provide a JSON response with:
1. "riskAssessment": Identify any risks or complications
2. "additionalPrecautions": Safety measures specific to this case
3. "estimatedTimeline": Realistic timeline considering Indian conditions
4. "resourceOptimization": Suggestions for efficient resource use
5. "qualityCheckpoints": Specific verification criteria

Respond with ONLY valid JSON.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const enhancement = JSON.parse(completion.choices[0].message.content);
    return enhancement;
  } catch (err) {
    console.warn('[ImplementationPlan] Groq enhancement failed:', err.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE: POST /api/implementation-plans/create/:ticketId
// Create implementation plan for a ticket (auto-triggered or manual)
// ═══════════════════════════════════════════════════════════════════════════
router.post('/create/:ticketId', protect, authorize('junior', 'engineer', 'senior_engineer', 'dept_head', 'officer', 'admin'), async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { useAI = true } = req.body;

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ message: 'Invalid ticket ID' });
    }

    const ticket = await MasterTicket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    let existingPlan = await ImplementationPlan.findOne({ masterTicketId: ticketId });
    if (existingPlan) {
      return res.json({ 
        message: 'Implementation plan already exists', 
        plan: existingPlan,
        isNew: false 
      });
    }

    const planData = await generateAIPlan(ticket);

    if (useAI && process.env.GROQ_API_KEY) {
      const enhancement = await enhancePlanWithGroq(ticket, planData);
      if (enhancement) {
        planData.aiEnhancement = enhancement;
      }
    }

    const plan = new ImplementationPlan(planData);
    await plan.save();

    ticket.implementationPlanId = plan._id;
    await ticket.save();

    console.log(`[ImplementationPlan] Created for ticket ${ticket.ticketNumber}, Level ${ticket.level}`);

    res.status(201).json({
      message: 'Implementation plan created successfully',
      plan: plan.toObject(),
      isNew: true,
      workflow: {
        level: ticket.level,
        nextStep: ticket.level === 1 
          ? 'Plan ready for direct execution by junior engineer'
          : 'Plan requires junior review → senior approval → execution'
      }
    });

  } catch (err) {
    console.error('[ImplementationPlan Create Error]', err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE: GET /api/implementation-plans/:ticketId
// Get implementation plan for a ticket
// ═══════════════════════════════════════════════════════════════════════════
router.get('/:ticketId', protect, async (req, res) => {
  try {
    const { ticketId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ message: 'Invalid ticket ID' });
    }

    const plan = await ImplementationPlan.findOne({ masterTicketId: ticketId })
      .populate('juniorReviewedBy', 'name email department')
      .populate('seniorReviewedBy', 'name email department')
      .populate('approvedBy', 'name email department')
      .populate('comments.author', 'name role department')
      .populate('approvalHistory.performedBy', 'name role');

    if (!plan) {
      return res.status(404).json({ message: 'Implementation plan not found' });
    }

    const canView = 
      req.user.role === 'admin' ||
      req.user.role === 'officer' ||
      req.user.role === 'dept_head' ||
      ['junior', 'engineer', 'senior_engineer'].includes(req.user.role) ||
      plan.isVisibleToCitizens;

    if (!canView) {
      return res.status(403).json({ 
        message: 'Implementation plan not yet approved for public viewing',
        status: plan.currentStage,
        isApproved: plan.status === 'approved'
      });
    }

    res.json(plan);

  } catch (err) {
    console.error('[ImplementationPlan Get Error]', err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE: GET /api/implementation-plans/pending/all
// Get all pending implementation plans (for dashboard)
// ═══════════════════════════════════════════════════════════════════════════
router.get('/pending/all', protect, authorize('junior', 'engineer', 'senior_engineer', 'dept_head', 'officer', 'admin'), async (req, res) => {
  try {
    const userRole = req.user.role;
    const userDept = req.user.department;

    let query = { isActive: true };

    if (['junior', 'engineer'].includes(userRole)) {
      query.$or = [
        { currentStage: 'ai_generated' },
        { currentStage: 'pending_junior_review' },
        { currentStage: 'approved' },
        { currentStage: 'in_progress' }
      ];
      if (userDept) query.department = userDept;
    } else if (userRole === 'senior_engineer') {
      query.$or = [
        { currentStage: 'pending_senior_review' },
        { currentStage: 'approved' },
        { currentStage: 'in_progress' }
      ];
      if (userDept) query.department = userDept;
    } else if (userRole === 'dept_head') {
      if (userDept) query.department = userDept;
    }

    const plans = await ImplementationPlan.find(query)
      .populate('masterTicketId', 'ticketNumber primaryCategory severity status location')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(plans);

  } catch (err) {
    console.error('[ImplementationPlan List Error]', err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE: PUT /api/implementation-plans/:planId/junior-review
// Junior Engineer reviews and edits the plan
// ═══════════════════════════════════════════════════════════════════════════
router.put('/:planId/junior-review', protect, authorize('junior', 'engineer'), async (req, res) => {
  try {
    const { planId } = req.params;
    const { 
      edits, 
      remarks, 
      stepRemarks,
      forwardToSenior = true 
    } = req.body;

    const plan = await ImplementationPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Implementation plan not found' });
    }

    if (!['ai_generated', 'pending_junior_review'].includes(plan.currentStage)) {
      return res.status(400).json({ 
        message: `Plan is at stage '${plan.currentStage}' - cannot edit at this stage` 
      });
    }

    if (edits && Array.isArray(edits)) {
      edits.forEach(edit => {
        const step = plan.steps.find(s => s.stepNumber === edit.stepNumber);
        if (step) {
          if (edit.title) step.title = edit.title;
          if (edit.description) step.description = edit.description;
          if (edit.estimatedHours) step.estimatedHours = edit.estimatedHours;
          if (edit.requiredMaterials) step.requiredMaterials = edit.requiredMaterials;
        }
      });
    }

    if (stepRemarks && typeof stepRemarks === 'object') {
      Object.entries(stepRemarks).forEach(([stepNum, remark]) => {
        const step = plan.steps.find(s => s.stepNumber === parseInt(stepNum));
        if (step) {
          step.juniorRemarks = remark;
          step.juniorEditedAt = new Date();
          step.juniorEditedBy = req.user._id;
        }
      });
    }

    plan.juniorReviewedAt = new Date();
    plan.juniorReviewedBy = req.user._id;
    plan.juniorEditCount = (plan.juniorEditCount || 0) + 1;

    plan.addHistory('junior_reviewed', req.user, remarks || 'Junior engineer reviewed the plan', {
      stepsModified: edits?.map(e => e.stepNumber) || [],
      previousStatus: plan.currentStage,
      newStatus: forwardToSenior ? 'pending_senior_review' : 'pending_junior_review'
    });

    if (forwardToSenior) {
      plan.currentStage = 'pending_senior_review';
      plan.status = 'under_review';
    } else {
      plan.currentStage = 'pending_junior_review';
    }

    await plan.save();

    console.log(`[ImplementationPlan] Junior review by ${req.user.name} for ${plan.ticketNumber}`);

    res.json({
      message: forwardToSenior 
        ? 'Plan reviewed and forwarded to senior engineer'
        : 'Plan saved as draft',
      plan: plan.toObject(),
      nextStage: plan.currentStage
    });

  } catch (err) {
    console.error('[Junior Review Error]', err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE: PUT /api/implementation-plans/:planId/senior-review
// Senior Engineer reviews, edits, and approves/rejects the plan
// ═══════════════════════════════════════════════════════════════════════════
router.put('/:planId/senior-review', protect, authorize('senior_engineer', 'dept_head', 'officer'), async (req, res) => {
  try {
    const { planId } = req.params;
    const { 
      edits, 
      remarks, 
      stepRemarks,
      action = 'approve', // 'approve', 'reject', 'send_back'
      additionalNotes
    } = req.body;

    const plan = await ImplementationPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Implementation plan not found' });
    }

    const validStages = ['ai_generated', 'pending_junior_review', 'pending_senior_review'];
    if (!validStages.includes(plan.currentStage)) {
      return res.status(400).json({ 
        message: `Plan is at stage '${plan.currentStage}' - cannot review at this stage` 
      });
    }

    if (edits && Array.isArray(edits)) {
      edits.forEach(edit => {
        const step = plan.steps.find(s => s.stepNumber === edit.stepNumber);
        if (step) {
          if (edit.title) step.title = edit.title;
          if (edit.description) step.description = edit.description;
          if (edit.estimatedHours) step.estimatedHours = edit.estimatedHours;
          if (edit.seniorRemarks !== undefined) step.seniorRemarks = edit.seniorRemarks;
        }
      });
    }

    if (stepRemarks && typeof stepRemarks === 'object') {
      Object.entries(stepRemarks).forEach(([stepNum, remark]) => {
        const step = plan.steps.find(s => s.stepNumber === parseInt(stepNum));
        if (step) {
          step.seniorRemarks = remark;
          step.seniorVerifiedAt = new Date();
          step.seniorVerifiedBy = req.user._id;
        }
      });
    }

    plan.seniorReviewedAt = new Date();
    plan.seniorReviewedBy = req.user._id;
    plan.seniorEditCount = (plan.seniorEditCount || 0) + 1;

    if (action === 'approve') {
      plan.currentStage = 'approved';
      plan.status = 'approved';
      plan.approvedAt = new Date();
      plan.approvedBy = req.user._id;
      plan.isVisibleToCitizens = true;
      plan.visibleFrom = new Date();

      plan.addHistory('approved', req.user, remarks || 'Senior engineer approved the implementation plan', {
        previousStatus: 'pending_senior_review',
        newStatus: 'approved'
      });

      const ticket = await MasterTicket.findById(plan.masterTicketId);
      if (ticket) {
        ticket.status = 'Assigned';
        ticket.actionHistory.push({
          newStatus: 'Assigned',
          remarks: `Implementation plan approved. Work can begin.`,
          progressPercentage: 0
        });
        await ticket.save();
      }

    } else if (action === 'send_back') {
      plan.currentStage = 'pending_junior_review';
      plan.status = 'draft';

      plan.addHistory('sent_back', req.user, remarks || 'Sent back to junior engineer for revision', {
        previousStatus: 'pending_senior_review',
        newStatus: 'pending_junior_review'
      });

    } else if (action === 'reject') {
      plan.currentStage = 'rejected';
      plan.status = 'rejected';

      plan.addHistory('rejected', req.user, remarks || 'Implementation plan rejected', {
        previousStatus: plan.currentStage,
        newStatus: 'rejected'
      });
    }

    if (additionalNotes) {
      plan.comments.push({
        author: req.user._id,
        authorRole: req.user.role,
        authorName: req.user.name,
        content: additionalNotes,
        timestamp: new Date(),
        isInternal: true
      });
    }

    await plan.save();

    console.log(`[ImplementationPlan] Senior ${action} by ${req.user.name} for ${plan.ticketNumber}`);

    res.json({
      message: action === 'approve' 
        ? 'Plan approved successfully. Junior engineer can now begin work.'
        : action === 'send_back'
        ? 'Plan sent back to junior engineer for revision'
        : 'Plan rejected',
      plan: plan.toObject(),
      workflow: {
        currentStage: plan.currentStage,
        nextAction: action === 'approve' 
          ? 'Junior engineer can start work execution'
          : 'Awaiting revision'
      }
    });

  } catch (err) {
    console.error('[Senior Review Error]', err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE: PUT /api/implementation-plans/:planId/level1-approve
// Direct approval for Level 1 tickets (by junior engineer)
// ═══════════════════════════════════════════════════════════════════════════
router.put('/:planId/level1-approve', protect, authorize('junior', 'engineer'), async (req, res) => {
  try {
    const { planId } = req.params;
    const { remarks } = req.body;

    const plan = await ImplementationPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Implementation plan not found' });
    }

    if (plan.level !== 1) {
      return res.status(400).json({ 
        message: 'This endpoint is only for Level 1 tickets. Use senior-review for higher levels.' 
      });
    }

    plan.currentStage = 'approved';
    plan.status = 'approved';
    plan.approvedAt = new Date();
    plan.approvedBy = req.user._id;
    plan.directApproved = true;
    plan.isVisibleToCitizens = true;
    plan.visibleFrom = new Date();
    plan.juniorReviewedAt = new Date();
    plan.juniorReviewedBy = req.user._id;

    plan.addHistory('approved', req.user, remarks || 'Level 1 ticket - direct approval by junior engineer', {
      previousStatus: 'ai_generated',
      newStatus: 'approved'
    });

    await plan.save();

    const ticket = await MasterTicket.findById(plan.masterTicketId);
    if (ticket) {
      ticket.status = 'Assigned';
      ticket.actionHistory.push({
        newStatus: 'Assigned',
        remarks: `Implementation plan approved (Level 1 - direct approval). Work can begin.`,
        progressPercentage: 0
      });
      await ticket.save();
    }

    console.log(`[ImplementationPlan] Level 1 direct approval for ${plan.ticketNumber}`);

    res.json({
      message: 'Level 1 plan approved. You can now begin work execution.',
      plan: plan.toObject()
    });

  } catch (err) {
    console.error('[Level1 Approve Error]', err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE: PUT /api/implementation-plans/:planId/start-work
// Junior engineer starts work execution
// ═══════════════════════════════════════════════════════════════════════════
router.put('/:planId/start-work', protect, authorize('junior', 'engineer'), async (req, res) => {
  try {
    const { planId } = req.params;
    const { stepNumber, beforePhotos = [] } = req.body;

    const plan = await ImplementationPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Implementation plan not found' });
    }

    if (plan.currentStage !== 'approved') {
      return res.status(400).json({ 
        message: `Plan must be approved before starting work. Current stage: ${plan.currentStage}` 
      });
    }

    plan.currentStage = 'in_progress';
    plan.status = 'in_progress';
    plan.workStartedAt = new Date();

    if (stepNumber) {
      const step = plan.steps.find(s => s.stepNumber === stepNumber);
      if (step) {
        step.status = 'in_progress';
        step.startedAt = new Date();
        if (beforePhotos.length > 0) {
          step.beforePhotos = beforePhotos;
        }
      }
    }

    plan.addHistory('work_started', req.user, 'Work execution started', {
      previousStatus: 'approved',
      newStatus: 'in_progress'
    });

    await plan.save();

    const ticket = await MasterTicket.findById(plan.masterTicketId);
    if (ticket) {
      ticket.status = 'In_Progress';
      ticket.actionHistory.push({
        newStatus: 'In_Progress',
        remarks: 'Work execution started by engineer',
        progressPercentage: 0
      });
      await ticket.save();
    }

    console.log(`[ImplementationPlan] Work started for ${plan.ticketNumber}`);

    res.json({
      message: 'Work execution started',
      plan: plan.toObject()
    });

  } catch (err) {
    console.error('[Start Work Error]', err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE: PUT /api/implementation-plans/:planId/step-progress
// Update progress on a specific step
// ═══════════════════════════════════════════════════════════════════════════
router.put('/:planId/step-progress', protect, authorize('junior', 'engineer'), async (req, res) => {
  try {
    const { planId } = req.params;
    const { 
      stepNumber, 
      status, 
      duringPhotos = [],
      afterPhotos = [],
      juniorRemarks,
      percentComplete 
    } = req.body;

    const plan = await ImplementationPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Implementation plan not found' });
    }

    const step = plan.steps.find(s => s.stepNumber === stepNumber);
    if (!step) {
      return res.status(404).json({ message: 'Step not found' });
    }

    if (status) step.status = status;
    if (duringPhotos.length > 0) step.duringPhotos.push(...duringPhotos);
    if (afterPhotos.length > 0) step.afterPhotos.push(...afterPhotos);
    if (juniorRemarks) step.juniorRemarks = juniorRemarks;

    if (status === 'completed') {
      step.completedAt = new Date();
    }

    const completedSteps = plan.steps.filter(s => s.status === 'completed').length;
    const totalSteps = plan.steps.length;
    plan.overallProgress = Math.round((completedSteps / totalSteps) * 100);

    plan.addHistory('progress_updated', req.user, `Step ${stepNumber} updated to ${status || 'in progress'}`, {
      stepsModified: [stepNumber],
      fieldsModified: ['status', 'progress']
    });

    await plan.save();

    const ticket = await MasterTicket.findById(plan.masterTicketId);
    if (ticket) {
      ticket.progressPercent = plan.overallProgress;
      ticket.actionHistory.push({
        newStatus: ticket.status,
        remarks: `Progress: Step ${stepNumber} ${status || 'updated'} (${plan.overallProgress}% complete)`,
        progressPercentage: plan.overallProgress
      });
      await ticket.save();
    }

    console.log(`[ImplementationPlan] Step ${stepNumber} progress for ${plan.ticketNumber}: ${plan.overallProgress}%`);

    res.json({
      message: 'Progress updated successfully',
      plan: plan.toObject(),
      overallProgress: plan.overallProgress
    });

  } catch (err) {
    console.error('[Step Progress Error]', err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE: PUT /api/implementation-plans/:planId/verify-step
// Senior engineer verifies a completed step
// ═══════════════════════════════════════════════════════════════════════════
router.put('/:planId/verify-step', protect, authorize('senior_engineer', 'dept_head', 'officer'), async (req, res) => {
  try {
    const { planId } = req.params;
    const { stepNumber, verified, seniorRemarks } = req.body;

    const plan = await ImplementationPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Implementation plan not found' });
    }

    const step = plan.steps.find(s => s.stepNumber === stepNumber);
    if (!step) {
      return res.status(404).json({ message: 'Step not found' });
    }

    if (step.status !== 'completed') {
      return res.status(400).json({ message: 'Step must be completed before verification' });
    }

    step.status = verified ? 'verified' : 'rejected';
    step.seniorRemarks = seniorRemarks || '';
    step.seniorVerifiedAt = new Date();
    step.seniorVerifiedBy = req.user._id;

    plan.addHistory(verified ? 'verified' : 'rejected', req.user, 
      seniorRemarks || `Step ${stepNumber} ${verified ? 'verified' : 'rejected'}`, {
        stepsModified: [stepNumber],
        previousStatus: 'completed',
        newStatus: verified ? 'verified' : 'rejected'
      });

    const verifiedSteps = plan.steps.filter(s => s.status === 'verified').length;
    const totalSteps = plan.steps.length;
    plan.overallProgress = Math.round((verifiedSteps / totalSteps) * 100);

    await plan.save();

    console.log(`[ImplementationPlan] Step ${stepNumber} ${verified ? 'verified' : 'rejected'} for ${plan.ticketNumber}`);

    res.json({
      message: verified ? 'Step verified successfully' : 'Step rejected - requires rework',
      plan: plan.toObject()
    });

  } catch (err) {
    console.error('[Verify Step Error]', err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE: PUT /api/implementation-plans/:planId/complete
// Mark entire work as complete
// ═══════════════════════════════════════════════════════════════════════════
router.put('/:planId/complete', protect, authorize('junior', 'engineer'), async (req, res) => {
  try {
    const { planId } = req.params;
    const { finalRemarks, finalPhotos = [] } = req.body;

    const plan = await ImplementationPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Implementation plan not found' });
    }

    const allStepsComplete = plan.steps.every(s => s.status === 'completed' || s.status === 'verified');
    if (!allStepsComplete) {
      return res.status(400).json({ 
        message: 'All steps must be completed before marking work as complete' 
      });
    }

    plan.currentStage = 'completed';
    plan.status = 'completed';
    plan.workCompletedAt = new Date();
    plan.overallProgress = 100;

    plan.addHistory('work_completed', req.user, finalRemarks || 'Work execution completed', {
      previousStatus: 'in_progress',
      newStatus: 'completed'
    });

    if (finalRemarks) {
      plan.comments.push({
        author: req.user._id,
        authorRole: req.user.role,
        authorName: req.user.name,
        content: finalRemarks,
        timestamp: new Date()
      });
    }

    await plan.save();

    const ticket = await MasterTicket.findById(plan.masterTicketId);
    if (ticket) {
      ticket.status = 'Pending_Verification';
      ticket.progressPercent = 100;
      ticket.actionHistory.push({
        newStatus: 'Pending_Verification',
        remarks: 'Work completed. Awaiting senior verification.',
        progressPercentage: 100
      });
      await ticket.save();
    }

    console.log(`[ImplementationPlan] Work completed for ${plan.ticketNumber}`);

    res.json({
      message: 'Work marked as complete. Awaiting senior verification.',
      plan: plan.toObject()
    });

  } catch (err) {
    console.error('[Complete Work Error]', err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE: PUT /api/implementation-plans/:planId/final-verify
// Senior engineer final verification and approval
// ═══════════════════════════════════════════════════════════════════════════
router.put('/:planId/final-verify', protect, authorize('senior_engineer', 'dept_head', 'officer'), async (req, res) => {
  try {
    const { planId } = req.params;
    const { verified, seniorRemarks } = req.body;

    const plan = await ImplementationPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Implementation plan not found' });
    }

    if (plan.currentStage !== 'completed') {
      return res.status(400).json({ message: 'Plan must be completed before final verification' });
    }

    plan.currentStage = verified ? 'verified' : 'in_progress';
    plan.status = verified ? 'verified' : 'in_progress';

    plan.addHistory(verified ? 'verified' : 'sent_back', req.user, 
      seniorRemarks || (verified ? 'Final verification complete' : 'Sent back for corrections'), {
        previousStatus: 'completed',
        newStatus: verified ? 'verified' : 'in_progress'
      });

    await plan.save();

    const ticket = await MasterTicket.findById(plan.masterTicketId);
    if (ticket) {
      if (verified) {
        ticket.status = 'Resolved';
        ticket.resolvedAt = new Date();
        ticket.actionHistory.push({
          newStatus: 'Resolved',
          remarks: 'Work verified and approved by senior engineer.',
          progressPercentage: 100
        });
      } else {
        ticket.status = 'In_Progress';
        ticket.actionHistory.push({
          newStatus: 'In_Progress',
          remarks: 'Work requires corrections. Sent back to engineer.',
          progressPercentage: 80
        });
      }
      await ticket.save();
    }

    console.log(`[ImplementationPlan] Final ${verified ? 'verified' : 'sent back'} for ${plan.ticketNumber}`);

    res.json({
      message: verified 
        ? 'Work verified and approved. Ticket resolved.' 
        : 'Sent back for corrections.',
      plan: plan.toObject()
    });

  } catch (err) {
    console.error('[Final Verify Error]', err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE: POST /api/implementation-plans/:planId/comment
// Add a comment to the plan
// ═══════════════════════════════════════════════════════════════════════════
router.post('/:planId/comment', protect, async (req, res) => {
  try {
    const { planId } = req.params;
    const { content, isInternal = false } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const plan = await ImplementationPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Implementation plan not found' });
    }

    plan.comments.push({
      author: req.user._id,
      authorRole: req.user.role,
      authorName: req.user.name,
      content: content.trim(),
      timestamp: new Date(),
      isInternal: isInternal && ['admin', 'officer', 'dept_head', 'senior_engineer', 'junior', 'engineer'].includes(req.user.role)
    });

    await plan.save();

    res.json({
      message: 'Comment added successfully',
      comment: plan.comments[plan.comments.length - 1]
    });

  } catch (err) {
    console.error('[Add Comment Error]', err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE: GET /api/implementation-plans/citizen/:ticketId
// Citizen view of approved implementation plan
// ═══════════════════════════════════════════════════════════════════════════
router.get('/citizen/:ticketId', protect, async (req, res) => {
  try {
    const { ticketId } = req.params;

    const plan = await ImplementationPlan.findOne({ 
      masterTicketId: ticketId,
      isVisibleToCitizens: true 
    }).select('-approvalHistory -comments.isInternal -steps.juniorRemarks -steps.seniorRemarks');

    if (!plan) {
      return res.status(404).json({ 
        message: 'Implementation plan not yet approved for viewing',
        note: 'Plans become visible after approval by senior engineer'
      });
    }

    const ticket = await MasterTicket.findById(ticketId);
    
    const isRelated = 
      req.user.role === 'admin' ||
      ticket?.complainantId?.toString() === req.user._id.toString() ||
      await hasRelatedComplaint(req.user._id, ticketId);

    if (!isRelated && req.user.role === 'user') {
      return res.status(403).json({ 
        message: 'You can only view plans for your own complaints' 
      });
    }

    const publicPlan = {
      ticketNumber: plan.ticketNumber,
      title: plan.title,
      description: plan.description,
      problemAnalysis: plan.problemAnalysis,
      category: plan.category,
      department: plan.department,
      overallProgress: plan.overallProgress,
      currentStage: plan.currentStage,
      totalEstimatedHours: plan.totalEstimatedHours,
      steps: plan.steps.map(s => ({
        stepNumber: s.stepNumber,
        title: s.title,
        description: s.description,
        status: s.status,
        completedAt: s.completedAt
      })),
      workStartedAt: plan.workStartedAt,
      workCompletedAt: plan.workCompletedAt
    };

    res.json(publicPlan);

  } catch (err) {
    console.error('[Citizen Plan View Error]', err);
    res.status(500).json({ message: err.message });
  }
});

async function hasRelatedComplaint(userId, masterTicketId) {
  const { RawComplaint } = require('../models/Ticket');
  const complaint = await RawComplaint.findOne({
    userId,
    masterTicketId
  });
  return !!complaint;
}

module.exports = router;
