import { Router } from "express";
import {
  postCancelAppointment,
  postCreateAppointment,
  getCustomer,
  getAppointments,
  postAddNotesToAppointment,
} from "../controllers/postController";
import {
  sendMessageToAdminController,
  phoneController,
  phoneControllerFromParams,
} from "../controllers/phoneController";

const postRouter = Router();

postRouter.post("/sms", phoneController);
postRouter.post("/sms/admin", sendMessageToAdminController);
postRouter.post("/sms/:to/:body", phoneControllerFromParams);

postRouter.post("/appointments", getAppointments);
postRouter.post("/appointment", postCreateAppointment);
postRouter.post("/appointment/cancel", postCancelAppointment);
postRouter.post("/appointment/notes", postAddNotesToAppointment);

postRouter.post("/customer", getCustomer);

export default postRouter;
