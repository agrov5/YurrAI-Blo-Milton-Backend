import { Router } from "express";
import { postCreateAppointment } from "../controllers/postController";
import {
  sendMessageToAdminController,
  twilioController,
  twilioControllerFromParams,
} from "../controllers/twillioController";

const postRouter = Router();

postRouter.post("/sms", twilioController);
postRouter.post("/sms/admin", sendMessageToAdminController);
postRouter.post("/sms/:to/:body", twilioControllerFromParams);

postRouter.post("/appointment", postCreateAppointment);

export default postRouter;
