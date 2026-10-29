import { normalizeStreet, splitUnit } from '../utils/address';
import {
  NycDataClient,
  ResearchDataClient,
  DataResult,
  Row,
  datasets,
  quote,
} from '../research/nyc-data';
import { ResearchResult, ResearchSection } from '../research/types';
export type { ResearchResult } from '../research/types';

const client = new NycDataClient();
const boroughs: Record<string, string> = {
  Manhattan: '1',
  Bronx: '2',
  Brooklyn: '3',
  Queens: '4',
  'Staten Island': '5',
};
export interface ResearchAddress {
  street: string;
  borough: string;
  confirmedBuildingId?: string;
}
export function validateResearchAddress(input: unknown): input is ResearchAddress {
  const value = input as ResearchAddress | null;
  return (
    !!value &&
    typeof value.street === 'string' &&
    value.street.trim().length <= 160 &&
    (value.confirmedBuildingId === undefined ||
      (typeof value.confirmedBuildingId === 'string' &&
        /^\d{1,12}$/.test(value.confirmedBuildingId))) &&
    typeof value.borough === 'string' &&
    /^\d[\w-]*\s+\S/.test(value.street.trim()) &&
    Object.prototype.hasOwnProperty.call(boroughs, value.borough)
  );
}
const date = (value?: string): string | null =>
  value && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
const shortDate = (value?: string) => date(value)?.slice(0, 10) || 'Not reported';
const isAvailable = (result: DataResult) => result.source.status !== 'unavailable';

export class ResearchService {
  static async suggestAddresses(input: ResearchAddress, data: ResearchDataClient = client) {
    const [house, ...parts] = normalizeStreet(splitUnit(input.street).street).split(' ');
    const prefix = parts.join(' ').replace(/[%_]/g, '');
    const result = await data.query('buildings', {
      $where: `boroid=${quote(boroughs[input.borough])} AND housenumber=${quote(house)} AND streetname like ${quote(prefix + '%')} AND recordstatus='Active'`,
      $limit: '8',
      $order: 'streetname,buildingid',
    });
    return {
      suggestions: [
        ...new Map(
          result.rows
            .filter(
              (row) => /^\d+$/.test(row.buildingid || '') && row.housenumber && row.streetname,
            )
            .map((row) => [
              row.buildingid,
              {
                street: `${row.housenumber} ${row.streetname}`,
                borough: input.borough,
                buildingId: row.buildingid,
                bin: row.bin || null,
              },
            ]),
        ).values(),
      ],
      source: result.source,
      notice:
        'HPD address suggestions are candidates. Confirm the building before attaching records; the registry does not cover every NYC property.',
    };
  }
  static async researchAddress(
    input: ResearchAddress,
    data: ResearchDataClient = client,
  ): Promise<ResearchResult> {
    if (!validateResearchAddress(input))
      throw new Error('Enter a street number, street name, and NYC borough.');
    const normalized = normalizeStreet(splitUnit(input.street).street);
    const [house, ...streetParts] = normalized.split(' ');
    const street = streetParts.join(' ');
    const generatedAt = new Date().toISOString();
    const report: ResearchResult = {
      version: 2,
      generatedAt,
      address: `${input.street.trim()}, ${input.borough}, NY`,
      summary: '',
      match: { status: 'not_found', explanation: '' },
      metrics: [],
      sections: [],
      violations: [],
      sources: [],
      tips: [],
      limitations: [
        'Records describe a building or tax lot, not necessarily the apartment you plan to rent.',
        'Public datasets can lag inspections and repairs. Retrieval date and dataset update date are different.',
        'No market rent assessment, safety rating, Walk Score, or verified tenant review coverage is available.',
      ],
      resourceLinks: [
        {
          name: 'HPD Online · verify housing records',
          url: 'https://hpdonline.nyc.gov/hpdonline/building/search',
        },
        {
          name: 'DOB · permits and building history',
          url: 'https://a810-bisweb.nyc.gov/bisweb/bispi00.jsp',
        },
        { name: 'JustFix · Who Owns What', url: 'https://whoownswhat.justfix.org/' },
        { name: 'MTA · check your commute', url: 'https://www.mta.info/' },
        {
          name: 'NYC · flood hazard mapper',
          url: 'https://www.nyc.gov/site/planning/data-maps/flood-hazard-mapper.page',
        },
      ],
    };
    const building: ResearchSection = {
      id: 'building',
      title: 'Building conditions & history',
      facts: [],
      analysis: [],
      unknowns: [],
      questions: [
        'Can you show the repair history for this unit, including leaks, pests, heat, and hot water?',
        'Which work is planned during the lease, and how will it affect access or noise?',
      ],
    };
    const neighborhood: ResearchSection = {
      id: 'neighborhood',
      title: 'Neighborhood & daily life',
      facts: [],
      analysis: [],
      unknowns: [
        'Commute times, street noise, grocery access, and flood exposure have not been measured.',
        'Crime statistics have not been retrieved. No safety rating is assigned.',
      ],
      questions: [
        'Try your actual commute at the times you travel.',
        'Visit the block during the day and evening; check noise, groceries, lighting, and accessibility.',
      ],
    };
    const management: ResearchSection = {
      id: 'management',
      title: 'Ownership & property management',
      facts: [],
      analysis: [],
      unknowns: [
        'Tenant reviews and management response times have not been independently verified.',
      ],
      questions: [
        'Who handles repairs day to day, and what is the emergency maintenance process?',
        'Ask current tenants about repair follow-through, communication, and deposit return.',
      ],
    };
    report.sections = [building, neighborhood, management];
    const matchResult = await data.query('buildings', {
      $where: `boroid=${quote(boroughs[input.borough])} AND housenumber=${quote(house)} AND streetname=${quote(street)} AND recordstatus='Active'`,
      $limit: '10',
    });
    report.sources.push(matchResult.source);
    const matches = [
      ...new Map(
        matchResult.rows
          .filter(
            (r) =>
              r.buildingid &&
              normalizeStreet(`${r.housenumber || ''} ${r.streetname || ''}`) === normalized &&
              (!r.boroid || r.boroid === boroughs[input.borough]) &&
              (!r.boro || r.boro.toLowerCase() === input.borough.toLowerCase()) &&
              (!input.confirmedBuildingId || r.buildingid === input.confirmedBuildingId),
          )
          .map((r) => [r.buildingid, r]),
      ).values(),
    ];
    if (!isAvailable(matchResult) || matches.length !== 1) {
      report.match.status = !isAvailable(matchResult)
        ? 'unavailable'
        : matches.length > 1
          ? 'ambiguous'
          : 'not_found';
      report.match.explanation =
        report.match.status === 'unavailable'
          ? 'The building registry could not be reached.'
          : report.match.status === 'ambiguous'
            ? 'More than one building matches. Confirm the building identity in HPD Online before relying on records.'
            : 'No exact active HPD building match. Check the street spelling, borough, or alternate entrance in HPD Online. Some properties are outside HPD coverage.';
      report.summary =
        'Building identity needs confirmation before a reliable report can be assembled.';
      building.unknowns.push(
        'Building records were not attached because the address could not be uniquely matched.',
      );
      management.unknowns.push('Registered owner and managing agent could not be established.');
      for (const id of ['violations', 'registrations', 'contacts', 'pluto', 'subway'] as const) {
        report.sources.push({
          id,
          name: datasets[id].name,
          url: `https://${id === 'subway' ? 'data.ny.gov' : 'data.cityofnewyork.us'}/d/${datasets[id].id}`,
          retrievedAt: generatedAt,
          datasetUpdatedAt: null,
          status: 'not_checked',
          detail: 'Requires a unique building match.',
        });
      }
      report.tips = report.sections.flatMap((s) => s.questions);
      return report;
    }
    const matched = matches[0];
    // Validate identifiers before using them in secondary queries.
    if (![matched.buildingid, matched.block, matched.lot].every((v) => /^\d+$/.test(v || '')))
      throw new Error('Building registry returned invalid identifiers.');
    const bbl = `${boroughs[input.borough]}${matched.block.padStart(5, '0')}${matched.lot.padStart(4, '0')}`;
    report.match = {
      status: 'matched',
      buildingId: matched.buildingid,
      bin: matched.bin,
      bbl,
      matchedAddress: `${matched.housenumber} ${matched.streetname}, ${matched.boro} ${matched.zip || ''}`,
      explanation: input.confirmedBuildingId
        ? 'You confirmed this HPD building ID. It was rechecked against the exact street address and borough before records were attached. Apartment numbers are excluded.'
        : 'Exact house number, normalized street name, and borough matched one active HPD building. Apartment numbers are excluded from building research.',
    };
    building.facts.push({
      label: 'HPD building ID',
      value: matched.buildingid,
      sourceIds: ['buildings'],
    });
    if (matched.bin)
      building.facts.push({
        label: 'Building identification number (BIN)',
        value: matched.bin,
        sourceIds: ['buildings'],
      });
    const [counts, recent, registration, lot] = await Promise.all([
      data.query('violations', {
        $where: `buildingid=${quote(matched.buildingid)}`,
        $select: 'class,violationstatus,count(distinct violationid) as count',
        $group: 'class,violationstatus',
        $limit: '100',
      }),
      data.query('violations', {
        $where: `buildingid=${quote(matched.buildingid)}`,
        $order: 'novissueddate DESC NULLS LAST,violationid DESC',
        $limit: '20',
      }),
      data.query('registrations', {
        $where: `buildingid=${quote(matched.buildingid)}`,
        $order: 'registrationenddate DESC,registrationid DESC',
        $limit: '1',
      }),
      data.query('pluto', {
        $where: `borocode=${quote(boroughs[input.borough])} AND block=${quote(matched.block)} AND lot=${quote(matched.lot)}`,
        $limit: '2',
      }),
    ]);
    // Keep count and record queries separately auditable, including partial failures.
    recent.source.id = 'violation-records';
    recent.source.name += ' · latest 20 records';
    report.sources.push(counts.source, recent.source, registration.source, lot.source);
    const validCounts =
      isAvailable(counts) &&
      counts.rows.length < 100 &&
      counts.rows.every(
        (r) =>
          /^\d+$/.test(r.count) &&
          !!r.class &&
          ['open', 'close', 'closed'].includes(r.violationstatus?.toLowerCase()),
      );
    const open = validCounts
      ? counts.rows
          .filter((r) => r.violationstatus?.toLowerCase() === 'open')
          .reduce((n, r) => n + Number(r.count), 0)
      : null;
    const urgent = validCounts
      ? counts.rows
          .filter((r) => r.violationstatus?.toLowerCase() === 'open' && r.class === 'C')
          .reduce((n, r) => n + Number(r.count), 0)
      : null;
    const total = validCounts ? counts.rows.reduce((n, r) => n + Number(r.count), 0) : null;
    report.metrics.push(
      {
        label: 'Open HPD violations',
        value: open,
        detail: 'Building-wide · all available dates',
        sourceIds: ['violations'],
      },
      {
        label: 'Open class C',
        value: urgent,
        detail: 'HPD classification · immediately hazardous',
        sourceIds: ['violations'],
      },
      {
        label: 'Total recorded violations',
        value: total,
        detail: 'Open and closed · all available dates',
        sourceIds: ['violations'],
      },
    );
    if (open !== null) {
      building.facts.push({
        label: 'Open violations in this dataset',
        value: String(open),
        sourceIds: ['violations'],
      });
      building.analysis.push(
        open > 0
          ? 'Open records warrant follow-up. Ask for dated repair evidence and confirm current status with HPD; records may concern other units or common areas.'
          : 'No open violations were returned. This does not establish that the building or unit is free of problems.',
      );
      if (urgent && urgent > 0)
        building.questions.unshift(
          'Ask for the status and repair documentation for each open class C violation before deciding.',
        );
    } else
      building.unknowns.push(
        'Violation totals could not be retrieved or validated. Unknown is not zero.',
      );
    report.violations = [
      ...new Map(recent.rows.filter((r) => r.violationid).map((r) => [r.violationid, r])).values(),
    ].map((r) => ({
      id: r.violationid,
      class: r.class || 'Unknown',
      status: r.violationstatus || r.currentstatus || 'Unknown',
      description: r.novdescription || 'Description unavailable',
      issuedAt: date(r.novissueddate),
      statusAt: date(r.currentstatusdate),
      apartment: r.apartment || null,
    }));
    if (!isAvailable(recent))
      building.unknowns.push(
        'Individual violation details could not be retrieved, even if aggregate counts are available.',
      );
    building.unknowns.push(
      'DOB permits, complaints, litigation, and rent stabilization status have not been retrieved.',
    );
    const pluto = lot.rows.length === 1 ? lot.rows[0] : undefined;
    if (pluto) {
      for (const [label, key] of [
        ['Year built (tax lot)', 'yearbuilt'],
        ['Residential units (tax lot)', 'unitsres'],
        ['Buildings on tax lot', 'numbldgs'],
      ]) {
        if (Number(pluto[key]) > 0)
          building.facts.push({ label, value: pluto[key], sourceIds: ['pluto'] });
      }
      for (const [label, key] of [
        ['Community district', 'cd'],
        ['City Council district', 'council'],
        ['Police precinct', 'policeprct'],
        ['Zoning district', 'zonedist1'],
      ]) {
        if (pluto[key]) neighborhood.facts.push({ label, value: pluto[key], sourceIds: ['pluto'] });
      }
      neighborhood.analysis.push(
        'Administrative districts help locate local services and public records. They do not measure livability or safety.',
      );
      if (pluto.ownername && !/UNAVAILABLE|UNKNOWN/i.test(pluto.ownername))
        management.facts.push({
          label: 'Tax lot owner of record',
          value: pluto.ownername,
          sourceIds: ['pluto'],
        });
    } else
      building.unknowns.push(
        'No unique PLUTO tax lot record was available; building age and unit counts are unconfirmed.',
      );
    const latitude = Number(pluto?.latitude);
    const longitude = Number(pluto?.longitude);
    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude > 40 &&
      latitude < 42 &&
      longitude > -75 &&
      longitude < -73
    ) {
      const stations = await data.query('subway', {
        $where: `gtfs_latitude between ${latitude - 0.008} and ${latitude + 0.008} AND gtfs_longitude between ${longitude - 0.011} and ${longitude + 0.011}`,
        $select: 'station_id,complex_id,stop_name,daytime_routes,gtfs_latitude,gtfs_longitude',
        $limit: '100',
      });
      report.sources.push(stations.source);
      const nearby = stations.rows
        .map((station) => ({
          station,
          distance: distanceMiles(
            latitude,
            longitude,
            Number(station.gtfs_latitude),
            Number(station.gtfs_longitude),
          ),
        }))
        .filter((s) => Number.isFinite(s.distance) && s.distance <= 0.5)
        .sort((a, b) => a.distance - b.distance);
      const complexes = new Set<string>();
      for (const { station, distance } of nearby) {
        const identity = station.complex_id || station.station_id;
        if (!station.stop_name || complexes.has(identity)) continue;
        complexes.add(identity);
        const routes = [
          ...new Set(
            nearby
              .filter((s) => (s.station.complex_id || s.station.station_id) === identity)
              .flatMap((s) => (s.station.daytime_routes || '').split(' '))
              .filter(Boolean),
          ),
        ].join(', ');
        neighborhood.facts.push({
          label: `Subway · ${station.stop_name}`,
          value: `Calculated ${distance.toFixed(2)} mi straight-line${routes ? ` · ${routes}` : ''}`,
          sourceIds: ['subway', 'pluto'],
        });
        if (complexes.size === 3) break;
      }
      if (complexes.size)
        neighborhood.analysis.push(
          'Up to three station complexes within half a mile are shown. Distances are calculated from the tax lot location to station coordinates, not entrances or walking routes. Daytime routes come from MTA’s station inventory; check current service and accessibility with MTA.',
        );
      else
        neighborhood.unknowns.push(
          isAvailable(stations)
            ? 'No subway stations were found within half a mile using the available coordinates. Other transit options have not been checked.'
            : 'Nearby subway stations could not be retrieved.',
        );
    } else {
      neighborhood.unknowns.push(
        'A reliable tax lot location was unavailable for nearby transit research.',
      );
      report.sources.push({
        id: 'subway',
        name: datasets.subway.name,
        url: `https://data.ny.gov/d/${datasets.subway.id}`,
        retrievedAt: generatedAt,
        datasetUpdatedAt: null,
        status: 'not_checked',
        detail: 'Requires valid tax lot coordinates.',
      });
    }
    const reg = registration.rows[0];
    if (reg && /^\d+$/.test(reg.registrationid || '')) {
      management.facts.push(
        {
          label: 'Last registration filed',
          value: shortDate(reg.lastregistrationdate),
          sourceIds: ['registrations'],
        },
        {
          label: 'Registration end date',
          value: shortDate(reg.registrationenddate),
          sourceIds: ['registrations'],
        },
      );
      if (
        date(reg.registrationenddate) &&
        Date.parse(reg.registrationenddate) < Date.parse(generatedAt)
      )
        management.analysis.push(
          'The recorded registration end date has passed. Confirm the latest filing with HPD; the published dataset may lag.',
        );
      const contacts = await data.query('contacts', {
        $where: `registrationid=${quote(reg.registrationid)}`,
        $select: 'type,corporationname,firstname,middleinitial,lastname',
        $limit: '200',
      });
      report.sources.push(contacts.source);
      const seen = new Set<string>();
      for (const contact of contacts.rows) {
        if (!/agent|owner/i.test(contact.type || '')) continue;
        const name =
          contact.corporationname ||
          [contact.firstname, contact.middleinitial, contact.lastname].filter(Boolean).join(' ');
        if (!name || seen.has(`${contact.type}|${name}`)) continue;
        seen.add(`${contact.type}|${name}`);
        management.facts.push({
          label: `Registered ${contact.type.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()}`,
          value: name,
          sourceIds: ['contacts', 'registrations'],
        });
      }
      if (contacts.rows.length === 200)
        management.unknowns.push(
          'Contact results reached the retrieval limit; confirm the full registration directly.',
        );
      if (!seen.size)
        management.unknowns.push(
          'Owner and agent names were not available from registration contacts.',
        );
      management.analysis.push(
        'Registration identifies filed roles, not service quality. The registered owner, managing agent, broker, and day-to-day manager may be different. Building violations alone do not establish an individual manager’s reputation.',
      );
    } else {
      management.unknowns.push(
        'A current registration and its managing agent could not be established.',
      );
      report.sources.push({
        id: 'contacts',
        name: datasets.contacts.name,
        url: `https://data.cityofnewyork.us/d/${datasets.contacts.id}`,
        retrievedAt: generatedAt,
        datasetUpdatedAt: null,
        status: 'not_checked',
        detail: 'No registration ID was available.',
      });
    }
    report.summary =
      open === null
        ? 'The building was matched, but violation totals are unavailable. Review the evidence gaps before drawing conclusions.'
        : open > 0
          ? `The matched building has ${open} open HPD violation${open === 1 ? '' : 's'} in the published dataset${urgent ? `, including ${urgent} class C` : ''}. Use the records and questions below to guide your next conversation.`
          : 'The matched building has no open HPD violations in the retrieved dataset. Review the remaining gaps and inspect the actual unit before deciding.';
    report.tips = report.sections.flatMap((s) => s.questions);
    return report;
  }

  static async researchListing(listing: any): Promise<ResearchResult> {
    const address = listing.addressDetails || listing.address;
    const city = typeof address === 'object' ? address.city : '';
    const borough =
      Object.keys(boroughs).find((b) => b.toLowerCase() === city?.toLowerCase()) ||
      (['new york', 'new york city', 'nyc'].includes(city?.toLowerCase()) ? 'Manhattan' : '');
    return this.researchAddress({
      street: typeof address === 'object' ? address.street : String(address).split(',')[0],
      borough,
    });
  }

  static async sendResearchReport(userEmail: string, listing: any, research: ResearchResult) {
    const { EmailService } = await import('./email.service');
    return EmailService.sendResearchReport(userEmail, listing, research);
  }
}

/** Straight-line distance only; never presented as a walking time or route. */
export function distanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = (n: number) => (n * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
