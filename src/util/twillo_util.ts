import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

export async function sendMessage(to: string, body: string) {
  const from = "+19087748644";

  const message = await client.messages.create({
    body: body,
    from: from,
    to: to,
  });
}

export async function sendMessageToAdmin(body: string) {
  const from = "+19087748644";

  const message = await client.messages.create({
    body: body,
    from: from,
    to: "+14374243229",
  });
}
