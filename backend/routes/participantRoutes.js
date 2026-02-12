import express from 'express';
import {
    getParticipants,
    getParticipant,
    createParticipant,
    updateParticipant,
    deleteParticipant
} from '../controllers/participantController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { participantValidation } from '../validators/validators.js';
import { handleValidationErrors } from '../middleware/validationMiddleware.js';

const router = express.Router();

// All routes protected
router.use(authMiddleware);

// Authorization Note:
// The controllers for update (PUT) and delete (DELETE) enforce ownership checks.
// They scope queries by `userId: req.user.id`, ensuring users can only modify their own data.
// If a user attempts to access another user's participant, it will return 404 (preventing enumeration), effectively acting as authorization.

router.get('/', getParticipants);
router.get('/:id', getParticipant);
router.post('/', participantValidation, handleValidationErrors, createParticipant);
router.put('/:id', participantValidation, handleValidationErrors, updateParticipant);
router.delete('/:id', deleteParticipant);

export default router;
