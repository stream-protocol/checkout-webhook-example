import express, { Request, Response } from "express";
import { StreamPay } from "@streampay/checkout-sdk";
import { send } from "@ayshptk/msngr";
import fs from "node:fs";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", (_req: Request, res: Response) => {
  return res.status(200).json({
    message: "I'm alive!",
  });
});

app.post("/webhook", async (req: Request, res: Response) => {
  const headers = req.headers;
  const payload = req.body;

  const streampay = new StreamPay({
    api_key: process.env.STREAMPAY_API_KEY!,
    network: "devnet",
    config: {
      collect_shipping_address: false,
    },
  });

  try {
    await streampay.webhook.verify({
      payload,
      headers: headers as Record<string, string>,
      webhook_secret: process.env.WEBHOOK_SECRET!,
    });
  } catch (err) {
    return res.status(400).json({
      message: "Invalid webhook signature",
    });
  }

  // stores the transaction signature in a `.log` file
  fs.appendFileSync("events.log", `\n[${Date.now()}]: ${payload.signature}`, {
    encoding: "utf-8",
  });

  // send a discord message via webhooks
  await send(
    process.env.DISCORD_WEBHOOK_URL!,
    `💸 New payment webhook alert - ${payload.signature}`
  );

  return res.send();
});

const port = 3000 || process.env.PORT;

app.listen(3000, () => {
  console.log(`The server is running on port ${port}`);
});
