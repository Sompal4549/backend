import { Router } from 'express';
import { successResponse } from '../../../utils/api-response';

export const crmWorkflowsRouter = Router();

crmWorkflowsRouter.post('/:form', (req, res) => {
  const form = req.params.form;
  const payload = req.body;
  successResponse(
    res,
    { id: `WF-${Date.now()}`, form, submittedAt: new Date().toISOString(), data: payload },
    `Workflow for ${form} processed successfully`,
    201
  );
});

export default crmWorkflowsRouter;
