/**
 * Regenerates src/data/mta-stations.json from the official MTA station list
 * (src/data/MTA_Subway_Stations.csv, from data.ny.gov "MTA Subway Stations").
 *
 * One playable station per MTA station complex, so transfer hubs like
 * Times Sq-42 St / Port Authority are a single target. Every platform in the
 * complex is kept in `coordinates` and guesses are scored against the nearest.
 *
 * Usage: npm run build:stations
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(__dirname, '..', 'src', 'data');
const CSV_PATH = join(DATA_DIR, 'MTA_Subway_Stations.csv');
const OUT_PATH = join(DATA_DIR, 'mta-stations.json');

const BOROUGHS: Record<string, string> = {
  M: 'Manhattan',
  Bk: 'Brooklyn',
  Q: 'Queens',
  Bx: 'The Bronx',
  SI: 'Staten Island',
};

/** Staten Island Railway is a separate system and is not playable */
const EXCLUDED_ROUTES = new Set(['SIR']);

/** Shuttles are shown on a station but don't make it playable on their own */
const SHUTTLE_ROUTES = new Set(['S']);

/** MTA's conventional route ordering, used for display */
const ROUTE_ORDER = ['1', '2', '3', '4', '5', '6', '7', 'A', 'C', 'E', 'B', 'D', 'F', 'M', 'G', 'J', 'Z', 'L', 'N', 'Q', 'R', 'W', 'S'];

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...body] = rows.filter(r => r.some(cell => cell.length > 0));
  if (!header) throw new Error('CSV is empty');
  return body.map(cells => Object.fromEntries(header.map((name, i) => [name, cells[i] ?? ''])));
}

function sortRoutes(routes: Iterable<string>): string[] {
  const rank = (route: string) => {
    const index = ROUTE_ORDER.indexOf(route);
    return index === -1 ? ROUTE_ORDER.length : index;
  };
  return [...new Set(routes)].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

function main(): void {
  const rows = parseCsv(readFileSync(CSV_PATH, 'utf-8'));

  const complexes = new Map<string, Record<string, string>[]>();
  for (const row of rows) {
    const complexId = row['Complex ID'];
    if (!complexId) continue;
    const group = complexes.get(complexId) ?? [];
    group.push(row);
    complexes.set(complexId, group);
  }

  const stations = [];
  for (const [complexId, platforms] of complexes) {
    const routes = sortRoutes(
      platforms.flatMap(p => p['Daytime Routes']!.split(/\s+/).filter(Boolean))
    ).filter(route => !EXCLUDED_ROUTES.has(route));

    const isPlayable = routes.some(route => !SHUTTLE_ROUTES.has(route));
    if (!isPlayable) continue;

    const coordinates = platforms.map(p => ({
      latitude: Number(p['GTFS Latitude']),
      longitude: Number(p['GTFS Longitude']),
    }));
    const names = [...new Set(platforms.map(p => p['Stop Name']!))];
    const borough = BOROUGHS[platforms[0]!['Borough']!];
    if (!borough) throw new Error(`Unknown borough for complex ${complexId}`);

    stations.push({
      id: complexId,
      station_name: names.join(' / '),
      line: routes.join(','),
      latitude: Number((coordinates.reduce((sum, c) => sum + c.latitude, 0) / coordinates.length).toFixed(6)),
      longitude: Number((coordinates.reduce((sum, c) => sum + c.longitude, 0) / coordinates.length).toFixed(6)),
      borough,
      coordinates,
    });
  }

  stations.sort((a, b) => Number(a.id) - Number(b.id));
  writeFileSync(OUT_PATH, JSON.stringify(stations, null, 2) + '\n');
  console.log(`Wrote ${stations.length} stations to ${OUT_PATH}`);
}

main();
