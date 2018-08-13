import "reflect-metadata";
import { Application } from "express";
import { connect } from "./db";
import { GraphQLMiddleware } from "./middlewares";
import { UserService } from "./services";
import { Strategy as BearerStrategy } from "passport-http-bearer";
import passport from "passport";
import { User } from "./entities";
import jwt from "jsonwebtoken";
import { SECRET } from "./constants";
import AuthRouter from "./auth";
global.Promise = require("bluebird");
const app: Application = require("express")();
const cors = require("cors");
const { json, urlencoded } = require("body-parser");
const oauth2 = require("./auth/oauth2");

passport.use(
  new BearerStrategy(async (token, done) => {
    try {
      const decoded: any = await jwt.verify(token, SECRET);

      if (!decoded.data || !decoded.data.id) {
        return done(new Error("Unauthorized"));
      }

      const user: User = await UserService.getUser(decoded.id);

      if (!user) {
        return done(new Error("Unauthorized"));
      }
      return done(null, user);
    } catch (e) {
      if (e.name === "JsonWebTokenError") {
        return done(new Error("Unauthorized"));
      }

      return done(e);
    }
  })
);

connect().then(connection => {
  console.log(`Database connected`);
  console.log(connection.options);

  app.use(cors());
  app.use(json());
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(urlencoded({ extended: false }));

  app.get("/", (q, s) => s.send("Hello"));
  app.use("/api", GraphQLMiddleware);
  app.use("/auth", AuthRouter);
});

if (app.get("env") !== "development") {
  const logger = require("morgan");
  app.use(logger("dev"));
}

if (app.get("env") === "production") {
  const helmet = require("helmet");
  app.use(helmet());
}

export default app;
