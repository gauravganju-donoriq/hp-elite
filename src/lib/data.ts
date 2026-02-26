import { Tournament, Team, Player, PlayerAvailability } from "./types";

function makePlayer(
  id: string,
  firstName: string,
  lastName: string,
  position: string,
  number: number
): Player {
  return { id, firstName, lastName, position, number };
}

const allTeams: Team[] = [
  {
    id: "team-1",
    name: "FC Phoenix",
    shortName: "PHX",
    color: "#e63946",
    players: [
      makePlayer("p1", "Laila", "Britford", "GK", 1),
      makePlayer("p2", "Gustavo", "Lopez-P", "DEF", 2),
      makePlayer("p3", "Abdul", "Mohsini", "MID", 8),
      makePlayer("p4", "Ahroon", "Nusraty", "FWD", 9),
    ],
  },
  {
    id: "team-2",
    name: "Dynamo United",
    shortName: "DYN",
    color: "#457b9d",
    players: [
      makePlayer("p5", "David", "Panamano", "GK", 1),
      makePlayer("p6", "Haroon", "Sarwari", "DEF", 4),
      makePlayer("p7", "Joe", "Bakeer", "MID", 10),
      makePlayer("p8", "Logan", "Bahumian", "FWD", 11),
    ],
  },
  {
    id: "team-3",
    name: "Real Azul",
    shortName: "RAZ",
    color: "#2a9d8f",
    players: [
      makePlayer("p9", "Eric", "Calvillo-E", "GK", 1),
      makePlayer("p10", "Sergio", "Gonzalez", "DEF", 3),
      makePlayer("p11", "Isaac", "Kim", "MID", 6),
      makePlayer("p12", "David", "Linus", "FWD", 7),
    ],
  },
  {
    id: "team-4",
    name: "Striker City",
    shortName: "STK",
    color: "#e9c46a",
    players: [
      makePlayer("p13", "Zach", "Meskunas", "GK", 1),
      makePlayer("p14", "Fasih", "Nooran", "DEF", 5),
      makePlayer("p15", "Haseeb", "Nooran", "MID", 8),
      makePlayer("p16", "Kevin", "Ramos", "FWD", 9),
    ],
  },
  {
    id: "team-5",
    name: "Thunder FC",
    shortName: "THU",
    color: "#f4a261",
    players: [
      makePlayer("p17", "Mahdi", "Hossaini", "GK", 1),
      makePlayer("p18", "Fernando", "Monterrosa", "DEF", 2),
      makePlayer("p19", "Dave", "Salas", "MID", 10),
      makePlayer("p20", "Jan", "Maldonado", "FWD", 11),
    ],
  },
  {
    id: "team-6",
    name: "Olympia SC",
    shortName: "OLY",
    color: "#264653",
    players: [
      makePlayer("p21", "Victor", "Calvillo-V", "GK", 1),
      makePlayer("p22", "AJ", "Aman", "DEF", 4),
      makePlayer("p23", "Muj", "Amin", "MID", 6),
      makePlayer("p24", "Dylan", "Conti-D", "FWD", 9),
    ],
  },
  {
    id: "team-7",
    name: "Vanguard FC",
    shortName: "VAN",
    color: "#6a4c93",
    players: [
      makePlayer("p25", "Gisele", "Huang", "GK", 1),
      makePlayer("p26", "Madie", "Miller", "DEF", 3),
      makePlayer("p27", "Quan", "Phan", "MID", 8),
      makePlayer("p28", "Brandon", "Williamson", "FWD", 11),
    ],
  },
  {
    id: "team-8",
    name: "Atlas Rangers",
    shortName: "ATL",
    color: "#b5838d",
    players: [
      makePlayer("p29", "Laila", "Britford", "GK", 12),
      makePlayer("p30", "Gustavo", "Lopez-P", "DEF", 14),
      makePlayer("p31", "Abdul", "Mohsini", "MID", 16),
      makePlayer("p32", "Haroon", "Sarwari", "FWD", 18),
    ],
  },
];

export const initialTournaments: Tournament[] = [
  {
    id: "t1",
    name: "2026 Spring Cup",
    description:
      "Annual inter-club soccer tournament at Field House. Group stage followed by knockout rounds.",
    startDate: "2026-02-02",
    endDate: "2026-03-08",
    location: "Field House",
    numberOfGroups: 4,
    teamsPerGroup: 2,
    status: "in_progress",
    teams: allTeams,
    groups: [
      { name: "Group A", teamIds: ["team-1", "team-2"] },
      { name: "Group B", teamIds: ["team-3", "team-4"] },
      { name: "Group C", teamIds: ["team-5", "team-6"] },
      { name: "Group D", teamIds: ["team-7", "team-8"] },
    ],
    matches: [
      {
        id: "m1",
        tournamentId: "t1",
        homeTeamId: "team-1",
        awayTeamId: "team-2",
        homeScore: 2,
        awayScore: 1,
        date: "2026-02-02",
        time: "17:00",
        location: "Field House",
        stage: "group",
        group: "Group A",
        matchday: 1,
        played: true,
      },
      {
        id: "m2",
        tournamentId: "t1",
        homeTeamId: "team-3",
        awayTeamId: "team-4",
        homeScore: 0,
        awayScore: 0,
        date: "2026-02-03",
        time: "17:00",
        location: "Field House",
        stage: "group",
        group: "Group B",
        matchday: 1,
        played: true,
      },
      {
        id: "m3",
        tournamentId: "t1",
        homeTeamId: "team-5",
        awayTeamId: "team-6",
        homeScore: 3,
        awayScore: 1,
        date: "2026-02-04",
        time: "17:00",
        location: "Field House",
        stage: "group",
        group: "Group C",
        matchday: 1,
        played: true,
      },
      {
        id: "m4",
        tournamentId: "t1",
        homeTeamId: "team-7",
        awayTeamId: "team-8",
        homeScore: null,
        awayScore: null,
        date: "2026-02-05",
        time: "17:00",
        location: "Field House",
        stage: "group",
        group: "Group D",
        matchday: 1,
        played: false,
      },
      {
        id: "semi-1",
        tournamentId: "t1",
        homeTeamId: "team-1",
        awayTeamId: "team-8",
        homeScore: null,
        awayScore: null,
        date: "2026-02-20",
        time: "17:00",
        location: "Field House",
        stage: "semi-final",
        played: false,
      },
      {
        id: "semi-2",
        tournamentId: "t1",
        homeTeamId: "team-3",
        awayTeamId: "team-5",
        homeScore: null,
        awayScore: null,
        date: "2026-02-21",
        time: "17:00",
        location: "Field House",
        stage: "semi-final",
        played: false,
      },
      {
        id: "final-1",
        tournamentId: "t1",
        homeTeamId: "tbd",
        awayTeamId: "tbd",
        homeScore: null,
        awayScore: null,
        date: "2026-03-01",
        time: "18:00",
        location: "Field House",
        stage: "final",
        played: false,
      },
    ],
  },
  {
    id: "t2",
    name: "K Sport Invitational",
    description: "Weekend invitational tournament at K Sport facility.",
    startDate: "2026-03-14",
    endDate: "2026-03-22",
    location: "K Sport",
    numberOfGroups: 2,
    teamsPerGroup: 2,
    status: "upcoming",
    teams: allTeams.slice(0, 4),
    groups: [
      { name: "Group A", teamIds: ["team-1", "team-2"] },
      { name: "Group B", teamIds: ["team-3", "team-4"] },
    ],
    matches: [],
  },
  {
    id: "t3",
    name: "Winter Classic 2025",
    description: "Last year's winter tournament.",
    startDate: "2025-12-01",
    endDate: "2025-12-15",
    location: "Field House",
    numberOfGroups: 4,
    teamsPerGroup: 2,
    status: "completed",
    teams: allTeams,
    groups: [
      { name: "Group A", teamIds: ["team-1", "team-2"] },
      { name: "Group B", teamIds: ["team-3", "team-4"] },
      { name: "Group C", teamIds: ["team-5", "team-6"] },
      { name: "Group D", teamIds: ["team-7", "team-8"] },
    ],
    matches: [],
  },
];

function generateSlots(dates: string[], startTime = "17:00", endTime = "20:00") {
  return dates.map((date) => ({ date, startTime, endTime }));
}

const feb = (d: number) => `2026-02-${String(d).padStart(2, "0")}`;

export const initialAvailability: PlayerAvailability[] = [
  // Team 1 - FC Phoenix
  { playerId: "p1", teamId: "team-1", tournamentId: "t1", slots: generateSlots([feb(2), feb(3), feb(5), feb(7), feb(9), feb(11), feb(14), feb(16), feb(18), feb(20)]) },
  { playerId: "p2", teamId: "team-1", tournamentId: "t1", slots: generateSlots([feb(2), feb(4), feb(6), feb(8), feb(10), feb(13), feb(15), feb(17), feb(20)]) },
  { playerId: "p3", teamId: "team-1", tournamentId: "t1", slots: generateSlots([feb(2), feb(3), feb(4), feb(6), feb(8), feb(11), feb(14), feb(18), feb(20)]) },
  { playerId: "p4", teamId: "team-1", tournamentId: "t1", slots: generateSlots([feb(3), feb(5), feb(7), feb(9), feb(12), feb(15), feb(17), feb(20)]) },
  // Team 2 - Dynamo United
  { playerId: "p5", teamId: "team-2", tournamentId: "t1", slots: generateSlots([feb(2), feb(4), feb(6), feb(9), feb(11), feb(14), feb(16), feb(19), feb(21)]) },
  { playerId: "p6", teamId: "team-2", tournamentId: "t1", slots: generateSlots([feb(2), feb(3), feb(5), feb(7), feb(10), feb(13), feb(16), feb(19), feb(21)]) },
  { playerId: "p7", teamId: "team-2", tournamentId: "t1", slots: generateSlots([feb(3), feb(5), feb(8), feb(10), feb(12), feb(15), feb(18), feb(21)]) },
  { playerId: "p8", teamId: "team-2", tournamentId: "t1", slots: generateSlots([feb(4), feb(6), feb(9), feb(11), feb(14), feb(17), feb(19), feb(21)]) },
  // Team 3 - Real Azul
  { playerId: "p9", teamId: "team-3", tournamentId: "t1", slots: generateSlots([feb(3), feb(5), feb(7), feb(10), feb(12), feb(15), feb(18), feb(20)]) },
  { playerId: "p10", teamId: "team-3", tournamentId: "t1", slots: generateSlots([feb(3), feb(4), feb(6), feb(9), feb(11), feb(14), feb(17), feb(20)]) },
  { playerId: "p11", teamId: "team-3", tournamentId: "t1", slots: generateSlots([feb(4), feb(6), feb(8), feb(10), feb(13), feb(16), feb(18), feb(20)]) },
  { playerId: "p12", teamId: "team-3", tournamentId: "t1", slots: generateSlots([feb(5), feb(7), feb(9), feb(12), feb(14), feb(17), feb(19)]) },
  // Team 4 - Striker City
  { playerId: "p13", teamId: "team-4", tournamentId: "t1", slots: generateSlots([feb(3), feb(5), feb(8), feb(10), feb(13), feb(16), feb(19)]) },
  { playerId: "p14", teamId: "team-4", tournamentId: "t1", slots: generateSlots([feb(4), feb(6), feb(8), feb(11), feb(14), feb(17), feb(19)]) },
  { playerId: "p15", teamId: "team-4", tournamentId: "t1", slots: generateSlots([feb(3), feb(5), feb(7), feb(10), feb(12), feb(15), feb(18)]) },
  { playerId: "p16", teamId: "team-4", tournamentId: "t1", slots: generateSlots([feb(4), feb(7), feb(9), feb(11), feb(14), feb(16), feb(19)]) },
  // Team 5 - Thunder FC
  { playerId: "p17", teamId: "team-5", tournamentId: "t1", slots: generateSlots([feb(4), feb(6), feb(9), feb(11), feb(14), feb(17), feb(20)]) },
  { playerId: "p18", teamId: "team-5", tournamentId: "t1", slots: generateSlots([feb(4), feb(5), feb(7), feb(10), feb(13), feb(16), feb(19)]) },
  { playerId: "p19", teamId: "team-5", tournamentId: "t1", slots: generateSlots([feb(5), feb(7), feb(9), feb(12), feb(15), feb(18), feb(20)]) },
  { playerId: "p20", teamId: "team-5", tournamentId: "t1", slots: generateSlots([feb(6), feb(8), feb(10), feb(13), feb(16), feb(19)]) },
  // Team 6 - Olympia SC
  { playerId: "p21", teamId: "team-6", tournamentId: "t1", slots: generateSlots([feb(4), feb(6), feb(8), feb(11), feb(14), feb(17), feb(20)]) },
  { playerId: "p22", teamId: "team-6", tournamentId: "t1", slots: generateSlots([feb(5), feb(7), feb(9), feb(12), feb(15), feb(18)]) },
  { playerId: "p23", teamId: "team-6", tournamentId: "t1", slots: generateSlots([feb(4), feb(6), feb(10), feb(13), feb(16), feb(19)]) },
  { playerId: "p24", teamId: "team-6", tournamentId: "t1", slots: generateSlots([feb(5), feb(8), feb(11), feb(14), feb(17), feb(20)]) },
  // Team 7 - Vanguard FC
  { playerId: "p25", teamId: "team-7", tournamentId: "t1", slots: generateSlots([feb(5), feb(7), feb(10), feb(12), feb(15), feb(18), feb(21)]) },
  { playerId: "p26", teamId: "team-7", tournamentId: "t1", slots: generateSlots([feb(5), feb(8), feb(10), feb(13), feb(16), feb(19), feb(21)]) },
  { playerId: "p27", teamId: "team-7", tournamentId: "t1", slots: generateSlots([feb(6), feb(9), feb(11), feb(14), feb(17), feb(20)]) },
  { playerId: "p28", teamId: "team-7", tournamentId: "t1", slots: generateSlots([feb(7), feb(9), feb(12), feb(15), feb(18), feb(21)]) },
  // Team 8 - Atlas Rangers
  { playerId: "p29", teamId: "team-8", tournamentId: "t1", slots: generateSlots([feb(5), feb(7), feb(10), feb(13), feb(16), feb(19)]) },
  { playerId: "p30", teamId: "team-8", tournamentId: "t1", slots: generateSlots([feb(6), feb(8), feb(11), feb(14), feb(17), feb(20)]) },
  { playerId: "p31", teamId: "team-8", tournamentId: "t1", slots: generateSlots([feb(5), feb(8), feb(10), feb(13), feb(15), feb(18)]) },
  { playerId: "p32", teamId: "team-8", tournamentId: "t1", slots: generateSlots([feb(7), feb(9), feb(12), feb(14), feb(17), feb(20)]) },
];

export function getTeamById(teams: Team[], id: string): Team | undefined {
  return teams.find((t) => t.id === id);
}

export function getTeamName(teams: Team[], id: string): string {
  if (id === "tbd") return "TBD";
  return teams.find((t) => t.id === id)?.name ?? "Unknown";
}

export function getTeamShortName(teams: Team[], id: string): string {
  if (id === "tbd") return "TBD";
  return teams.find((t) => t.id === id)?.shortName ?? "???";
}
