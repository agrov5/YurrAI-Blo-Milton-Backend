import { Router } from "express";
import { getCustomerCCInfo } from '../controllers/getController';
import {
  postCancelAppointment,
  postCreateAppointment,
  getCustomer,
  getAppointments,
  postAddNotesToAppointment,
  postAvailableDates,
  postAvailableTimes,
  postGenerateCCLink,
  getCustomerOrders,
  vapiCallDataWebhook,
  getVapiCostByMonth,
  updateCallTags,
  sendCCLinkToCustomer,
  sendMonthlyStatsReport,
  sendEmail,
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
postRouter.post("/cc-info", getCustomerCCInfo);


postRouter.post("/generate-cc-link", postGenerateCCLink);

postRouter.post('/get-customer-orders', getCustomerOrders)

postRouter.post("/vapi/webhook", vapiCallDataWebhook);
postRouter.post("/calls/costByMonth/", getVapiCostByMonth);
postRouter.patch("/calls/:id/tags", updateCallTags);
postRouter.post("/send-cc-link", sendCCLinkToCustomer);

postRouter.post("/email/stats", sendMonthlyStatsReport);
postRouter.post("/email/send", sendEmail);
export default postRouter;

