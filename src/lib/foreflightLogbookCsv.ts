/**
 * ForeFlight Logbook CSV exporter.
 *
 * ForeFlight's import format expects two CSV "tables" stacked in one file,
 * each preceded by a header marker row:
 *
 *   ForeFlight Logbook Import
 *
 *   Aircraft Table
 *   <aircraft headers>
 *   <aircraft rows>
 *
 *   Flights Table
 *   <flight headers>
 *   <flight rows>
 *
 * Reference: ForeFlight "Importing your logbook" template. The same CSV is
 * commonly used as a starting point for FAA IACRA flight-time tallies.
 */

export type ExportableLog = {
  flight_date: string;
  aircraft_type: string | null;
  tail_number: string | null;
  departure: string | null;
  destination: string | null;
  route: string | null;
  total_time: number;
  pic_time: number;
  sic_time: number;
  cross_country_time: number;
  night_time: number;
  instrument_time: number;
  simulated_instrument_time: number;
  day_landings: number;
  night_landings: number;
  approaches: number;
  remarks: string | null;
};

const csvEscape = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const row = (cells: unknown[]) => cells.map(csvEscape).join(",");

const AIRCRAFT_HEADERS = [
  "AircraftID",
  "EquipmentType",
  "TypeCode",
  "Year",
  "Make",
  "Model",
  "Category",
  "Class",
  "GearType",
  "EngineType",
  "Complex",
  "HighPerformance",
  "Pressurized",
  "TAA",
];

const FLIGHT_HEADERS = [
  "Date",
  "AircraftID",
  "From",
  "To",
  "Route",
  "TimeOut",
  "TimeOff",
  "TimeOn",
  "TimeIn",
  "OnDuty",
  "OffDuty",
  "TotalTime",
  "PIC",
  "SIC",
  "Night",
  "Solo",
  "CrossCountry",
  "NVG",
  "NVGOps",
  "Distance",
  "DayTakeoffs",
  "DayLandingsFullStop",
  "NightTakeoffs",
  "NightLandingsFullStop",
  "AllLandings",
  "ActualInstrument",
  "SimulatedInstrument",
  "HobbsStart",
  "HobbsEnd",
  "TachStart",
  "TachEnd",
  "Holds",
  "Approach1",
  "Approach2",
  "Approach3",
  "Approach4",
  "Approach5",
  "Approach6",
  "DualGiven",
  "DualReceived",
  "SimulatedFlight",
  "GroundTraining",
  "InstructorName",
  "InstructorComments",
  "Person1",
  "Person2",
  "Person3",
  "Person4",
  "Person5",
  "Person6",
  "FlightReview",
  "Checkride",
  "IPC",
  "NVGProficiency",
  "FAA6158",
  "[Text]CustomFieldName",
  "[Numeric]CustomFieldName",
  "[Hours]CustomFieldName",
  "[Counter]CustomFieldName",
  "[Date]CustomFieldName",
  "[DateTime]CustomFieldName",
  "[Toggle]CustomFieldName",
  "PilotComments",
];

/** Build the full CSV text. */
export const buildForeFlightCsv = (logs: ExportableLog[]): string => {
  // Aircraft table — derive a row per unique tail number.
  const aircraftByTail = new Map<string, ExportableLog>();
  for (const l of logs) {
    const tail = (l.tail_number || "").trim();
    if (!tail) continue;
    if (!aircraftByTail.has(tail)) aircraftByTail.set(tail, l);
  }

  const aircraftRows = Array.from(aircraftByTail.entries()).map(([tail, l]) => [
    tail,
    "Airplane", // EquipmentType
    l.aircraft_type ?? "", // TypeCode
    "", // Year
    "", // Make
    l.aircraft_type ?? "", // Model
    "airplane", // Category
    "airplane_single_engine_land", // Class — sensible default for trainer fleet
    "tricycle", // GearType
    "piston", // EngineType
    "", // Complex
    "", // HighPerformance
    "", // Pressurized
    "", // TAA
  ]);

  const flightRows = logs.map((l) => {
    const dayLdg = Number(l.day_landings) || 0;
    const nightLdg = Number(l.night_landings) || 0;
    const apr = Math.max(0, Math.min(6, Number(l.approaches) || 0));
    const approachCols = Array.from({ length: 6 }, (_, i) => (i < apr ? "1;PA;;" : ""));
    return [
      l.flight_date, // Date (YYYY-MM-DD)
      l.tail_number ?? "", // AircraftID
      l.departure ?? "", // From
      l.destination ?? "", // To
      l.route ?? "", // Route
      "", "", "", "", "", "", // TimeOut/Off/On/In, OnDuty, OffDuty
      Number(l.total_time).toFixed(1), // TotalTime
      Number(l.pic_time).toFixed(1), // PIC
      Number(l.sic_time).toFixed(1), // SIC
      Number(l.night_time).toFixed(1), // Night
      "", // Solo
      Number(l.cross_country_time).toFixed(1), // CrossCountry
      "", "", // NVG, NVGOps
      "", // Distance
      "", // DayTakeoffs
      String(dayLdg), // DayLandingsFullStop
      "", // NightTakeoffs
      String(nightLdg), // NightLandingsFullStop
      String(dayLdg + nightLdg), // AllLandings
      Number(l.instrument_time).toFixed(1), // ActualInstrument
      Number(l.simulated_instrument_time).toFixed(1), // SimulatedInstrument
      "", "", "", "", // Hobbs/Tach
      "", // Holds
      ...approachCols, // Approach1..6
      "", "", "", "", // DualGiven, DualReceived, SimulatedFlight, GroundTraining
      "", "", // InstructorName, InstructorComments
      "", "", "", "", "", "", // Person1..6
      "", "", "", "", "", // FlightReview, Checkride, IPC, NVGProficiency, FAA6158
      "", "", "", "", "", "", "", // Custom fields
      l.remarks ?? "", // PilotComments
    ];
  });

  const lines: string[] = [];
  lines.push("ForeFlight Logbook Import");
  lines.push("");
  lines.push("Aircraft Table");
  lines.push(row(AIRCRAFT_HEADERS));
  for (const r of aircraftRows) lines.push(row(r));
  lines.push("");
  lines.push("Flights Table");
  lines.push(row(FLIGHT_HEADERS));
  for (const r of flightRows) lines.push(row(r));
  return lines.join("\n");
};

export const downloadCsv = (filename: string, csv: string) => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
