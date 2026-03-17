import { NextResponse } from "next/server";

export async function GET() {

  try {

    return NextResponse.json(
      {
        message: "Frontend is running",
      },
      { status: 200 },
    );
  } catch (e) {
    return NextResponse.json(
      {
        message: "Frontend is not running",
      },
      { status: 503 },
    );
  }
}

