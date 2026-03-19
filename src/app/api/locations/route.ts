import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";

export async function GET() {
  try {
    // Await the database connection
    // await connectToDatabase();
    
    // For demo purposes, we return a mock array of locations.
    const mockLocations = [
      { id: 1, name: "Golden Gate Bridge", lat: 37.8199, lng: -122.4783 },
      { id: 2, name: "Alcatraz Island", lat: 37.8269, lng: -122.4229 },
    ];
    
    return NextResponse.json({ success: true, data: mockLocations }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch locations" }, { status: 500 });
  }
}
