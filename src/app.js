require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const { NODE_ENV } = require("./config");
const winston = require("winston");
const { v4: uuid } = require("uuid");

const app = express();

// set up winston
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: "info.log" })],
});
if (NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

const cards = [
  {
    id: 1,
    title: "Task One",
    content: "This is card one",
  },
];
const lists = [
  {
    id: 1,
    header: "List One",
    cardIds: [1],
  },
];

const morganOption = NODE_ENV === "production" ? "tiny" : "common";

app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use(function validateBearerToken(req, res, next) {
  const apiToken = process.env.API_TOKEN;
  const authToken = req.get("Authorization");
  if (!authToken || authToken.split(" ")[1] !== apiToken) {
    logger.error(`Unauthorized request to path: ${req.path}`);
    return res.status(401).json({ error: "Unauthorized request" });
  }
  // move to the next middleware
  next();
});

app.get("/", (req, res) => {
  res.send("Hello, world!");
});

app.get("/card", (req, res) => {
  res.json(cards);
});

app.get("/list", (req, res) => {
  res.json(lists);
});

app.get("/card/:id", (req, res) => {
  const { id } = req.params;
  const card = cards.find((c) => c.id == id);

  // make sure we found a card
  if (!card) {
    logger.error(`Card with id ${id} not found.`);
    return res.status(404).send("Card Not Found");
  }

  res.json(card);
});

app.post("/card", (req, res) => {
  // Get the data from the body:
  const { title, content } = req.body;

  //validate that both title and content exist.
  if (!title) {
    logger.error(`Title is required`);
    return res.status(400).send("Invalid data");
  }

  if (!content) {
    logger.error(`Content is required`);
    return res.status(400).send("Invalid data");
  }

  // get an id
  const id = uuid();

  const card = {
    id,
    title,
    content,
  };

  cards.push(card);

  // log the card creation and send a response including a location header.
  logger.info(`Card with id ${id} created`);

  res.status(201).location(`http://localhost:8000/card/${id}`).json(card);
});

app.use(function errorHandler(error, req, res, next) {
  let response;
  if (NODE_ENV === "production") {
    response = { error: { message: "server error" } };
  } else {
    console.error(error);
    response = { message: error.message, error };
  }
  res.status(500).json(response);
});

module.exports = app;
