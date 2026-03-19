import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Simulation from "@/models/Simulation";

export async function GET() {
  console.log(">>> [API] GET /api/simulation called");
  try {
    await connectToDatabase();
    console.log(">>> [API] Connected to DB (GET)");
    
    // Get the absolute most recent record for this user (active or inactive)
    const simulation = await Simulation.findOne({ userId: "default" }).sort({ createdAt: -1 });
    console.log(">>> [API] Fetch Result:", simulation ? `Found session (ID: ${simulation._id}, Active: ${simulation.isActive})` : "No results found");
    
    if (!simulation) {
      return NextResponse.json({ success: true, data: null });
    }
    
    return NextResponse.json({ success: true, data: simulation });
  } catch (error) {
    console.error(">>> [API] GET Simulation Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch simulation status" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  console.log(">>> [API] POST /api/simulation called");
  try {
    const body = await request.json();
    const { action, ...data } = body;
    console.log(">>> [API] Action:", action);
    
    await connectToDatabase();
    console.log(">>> [API] Connected to DB (POST)");
    
    if (action === "start") {
      console.log(">>> [API] Starting new simulation for default user...");
      await Simulation.updateMany({ userId: "default", isActive: true }, { isActive: false });
      
      const newSimulation = await Simulation.create({
        userId: "default",
        startTime: new Date(),
        totalDurationHours: data.hours,
        startPos: data.startPos,
        endPos: data.endPos,
        roadPath: data.roadPath,
        isReversed: data.isReversed,
        isActive: true,
      });
      
      console.log(">>> [API] Simulation created successfully in Atlas:", newSimulation._id);
      return NextResponse.json({ success: true, data: newSimulation });
    }
    
    if (action === "save-pos") {
      console.log(">>> [API] Saving static position...");
      // Deactivate any currently running simulations if we're setting a static pos
      await Simulation.updateMany({ userId: "default", isActive: true }, { isActive: false });
      
      const staticPos = await Simulation.create({
        userId: "default",
        startTime: new Date(),
        totalDurationHours: 0,
        startPos: data.pos,
        endPos: data.pos,
        roadPath: [data.pos, data.pos],
        isActive: false,
      });
      console.log(">>> [API] Static position saved:", staticPos._id);
      return NextResponse.json({ success: true, data: staticPos });
    }
    
    if (action === "stop") {
      console.log(">>> [API] Stopping simulation...");
      await Simulation.updateMany({ userId: "default", isActive: true }, { isActive: false });
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error(">>> [API] POST Simulation Error:", error);
    return NextResponse.json({ success: false, error: "Operation failed" }, { status: 500 });
  }
}
