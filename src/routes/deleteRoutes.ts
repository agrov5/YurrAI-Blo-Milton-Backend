import { Router } from "express";
import { deleteServerLogs, dropDatabase } from "../controllers/deleteController";


const deleteRouter = Router();

deleteRouter.delete("/database", dropDatabase); 
deleteRouter.delete("/server-logs", deleteServerLogs);

export default deleteRouter;