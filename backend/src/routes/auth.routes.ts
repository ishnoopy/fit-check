import { Hono } from "hono";
import { login, register } from "../controllers/auth.controller.js";

const routes = new Hono().
  post("/auth/login", login).
  post("/auth/register", register);

export default routes;