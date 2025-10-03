import { Router } from "express";
import { postCreateAppointment } from "../controllers/postController";

const postRouter = Router();

postRouter.post("/appointment", postCreateAppointment);

export default postRouter;
