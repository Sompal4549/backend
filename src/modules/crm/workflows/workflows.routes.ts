import { Router } from 'express';
import { successResponse } from '../../../utils/api-response';

export const crmWorkflowsRouter = Router();

crmWorkflowsRouter.post('/:form', async (req, res) => {
  const form = req.params.form;
  const payload = req.body;
  const id = `WF-${Date.now().toString().slice(-4)}`;
  try {
    const { CrmRecord } = await import('../../../models/crm-record.model');
    await CrmRecord.create({
      key: `workflow.${form}.${id}`,
      data: { id, form, submittedAt: new Date().toISOString(), ...payload }
    });
  } catch {}
  return successResponse(
    res,
    { id, form, submittedAt: new Date().toISOString(), data: payload },
    `Workflow for ${form} processed successfully`,
    201
  );
});

export default crmWorkflowsRouter;
