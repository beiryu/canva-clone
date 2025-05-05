import { Checkout } from "@polar-sh/nextjs";

const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN!;
const POLAR_SUCCESS_URL = `${process.env.NEXT_PUBLIC_APP_URL}?success=1`;

export const POST = Checkout({
  accessToken: POLAR_ACCESS_TOKEN,
  successUrl: POLAR_SUCCESS_URL,
});
