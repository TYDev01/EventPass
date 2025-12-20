import ical from "ical-generator";

const sanitizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const timezone = sanitizeText(body?.timezone) || "UTC";
    const events = Array.isArray(body?.events) ? body.events : [];

    const calendar = ical({
      name: "EventPass Calendar",
      timezone
    });

    events.forEach((item: any) => {
      const start = new Date(item.start);
      const end = new Date(item.end);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return;
      }
      calendar.createEvent({
        start,
        end,
        summary: sanitizeText(item.title) || "EventPass event",
        description: sanitizeText(item.description),
        location: sanitizeText(item.location)
      });
    });

    const icsContent = calendar.toString();
    return new Response(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": "attachment; filename=eventpass-events.ics"
      }
    });
  } catch (error) {
    console.error("Failed to generate iCal", error);
    return new Response("Unable to generate calendar", { status: 400 });
  }
}
