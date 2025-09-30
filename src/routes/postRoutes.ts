import { Router } from "express";
import { postCreateAppointment } from "../controllers/postController";

const postRouter = Router();

/**
 * @route   POST /appointment
 * @desc    Create a new appointment
 * @access  Private (requires auth)
 */

postRouter.post("/appointment", postCreateAppointment);

export default postRouter;