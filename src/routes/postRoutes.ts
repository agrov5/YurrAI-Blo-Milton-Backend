import { Router } from "express";
import {
  postCancelAppointment,
  postCreateAppointment,
  getCustomer,
  getAppointments,
  postAddNotesToAppointment,
  postAvailableDates,
  postAvailableTimes,
} from "../controllers/postController";
import {
  sendMessageToAdminController,
  phoneController,
} from "../controllers/phoneController";

const postRouter = Router();

postRouter.post("/sms", phoneController);
postRouter.post("/sms/admin", sendMessageToAdminController);

postRouter.post("/appointments", getAppointments);
postRouter.post("/appointment", postCreateAppointment);
postRouter.post("/appointment/cancel", postCancelAppointment);
postRouter.post("/appointment/notes", postAddNotesToAppointment);

postRouter.post("/available-dates", postAvailableDates);
postRouter.post("/available-times", postAvailableTimes);

postRouter.post("/customer", getCustomer);

export default postRouter;
