import {
  Match,
  Standing,
  Group,
  Team,
  PlayerAvailability,
  SuggestedMatch,
} from "./types";

export function generateGroupFixtures(
  tournamentId: string,
  groups: Group[],
  teams: Team[],
  startDate: string,
  location: string
): Match[] {
  const matches: Match[] = [];
  let matchCount = 0;
  const start = new Date(startDate);

  for (const group of groups) {
    const teamIds = group.teamIds;
    let matchday = 1;

    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i + 1; j < teamIds.length; j++) {
        const matchDate = new Date(start);
        matchDate.setDate(matchDate.getDate() + matchCount);

        matches.push({
          id: `match-${matchCount + 1}`,
          tournamentId,
          homeTeamId: teamIds[i],
          awayTeamId: teamIds[j],
          homeScore: null,
          awayScore: null,
          date: matchDate.toISOString().split("T")[0],
          time: "17:00",
          location,
          stage: "group",
          group: group.name,
          matchday,
          played: false,
        });

        matchday++;
        matchCount++;
      }
    }
  }

  return matches;
}

export function calculateStandings(
  group: Group,
  matches: Match[]
): Standing[] {
  const standingsMap: Record<string, Standing> = {};

  for (const teamId of group.teamIds) {
    standingsMap[teamId] = {
      teamId,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    };
  }

  const groupMatches = matches.filter(
    (m) => m.stage === "group" && m.group === group.name && m.played
  );

  for (const match of groupMatches) {
    const home = standingsMap[match.homeTeamId];
    const away = standingsMap[match.awayTeamId];
    if (!home || !away || match.homeScore === null || match.awayScore === null)
      continue;

    home.played++;
    away.played++;
    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (match.homeScore < match.awayScore) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += 1;
      away.points += 1;
    }

    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;
  }

  return Object.values(standingsMap).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference)
      return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
}

export function getGroupWinner(
  group: Group,
  matches: Match[]
): string | null {
  const standings = calculateStandings(group, matches);
  return standings.length > 0 ? standings[0].teamId : null;
}

export function generateKnockoutMatches(
  tournamentId: string,
  groups: Group[],
  matches: Match[],
  baseDate: string,
  location: string
): Match[] {
  const knockoutMatches: Match[] = [];
  const winners: (string | null)[] = groups.map((g) =>
    getGroupWinner(g, matches)
  );

  const semiDate1 = new Date(baseDate);
  semiDate1.setDate(semiDate1.getDate() + 1);
  const semiDate2 = new Date(baseDate);
  semiDate2.setDate(semiDate2.getDate() + 2);
  const finalDate = new Date(baseDate);
  finalDate.setDate(finalDate.getDate() + 4);

  // Semi 1: Winner A vs Winner D
  knockoutMatches.push({
    id: "semi-1",
    tournamentId,
    homeTeamId: winners[0] ?? "tbd",
    awayTeamId: winners[3] ?? "tbd",
    homeScore: null,
    awayScore: null,
    date: semiDate1.toISOString().split("T")[0],
    time: "17:00",
    location,
    stage: "semi-final",
    played: false,
  });

  // Semi 2: Winner B vs Winner C
  knockoutMatches.push({
    id: "semi-2",
    tournamentId,
    homeTeamId: winners[1] ?? "tbd",
    awayTeamId: winners[2] ?? "tbd",
    homeScore: null,
    awayScore: null,
    date: semiDate2.toISOString().split("T")[0],
    time: "17:00",
    location,
    stage: "semi-final",
    played: false,
  });

  // Final
  knockoutMatches.push({
    id: "final-1",
    tournamentId,
    homeTeamId: "tbd",
    awayTeamId: "tbd",
    homeScore: null,
    awayScore: null,
    date: finalDate.toISOString().split("T")[0],
    time: "18:00",
    location,
    stage: "final",
    played: false,
  });

  return knockoutMatches;
}

function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + "T12:00:00");
  const last = new Date(end + "T12:00:00");
  while (cur <= last) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function countAvailable(
  teamId: string,
  tournamentId: string,
  date: string,
  availability: PlayerAvailability[],
  teams: Team[]
): { available: number; total: number } {
  const team = teams.find((t) => t.id === teamId);
  const total = team?.players.length ?? 0;
  const teamAvail = availability.filter(
    (a) => a.teamId === teamId && a.tournamentId === tournamentId
  );
  let available = 0;
  for (const pa of teamAvail) {
    if (pa.slots.some((s) => s.date === date)) available++;
  }
  return { available, total };
}

export function suggestFixtures(
  groups: Group[],
  teams: Team[],
  availability: PlayerAvailability[],
  tournamentId: string,
  startDate: string,
  endDate: string,
  existingMatches: Match[]
): SuggestedMatch[] {
  const allDates = getDatesInRange(startDate, endDate);
  const suggestions: SuggestedMatch[] = [];

  const existingPairings = new Set(
    existingMatches
      .filter((m) => m.stage === "group")
      .map((m) => `${m.homeTeamId}-${m.awayTeamId}`)
  );

  const pairings: { homeTeamId: string; awayTeamId: string; group: string }[] =
    [];
  for (const group of groups) {
    for (let i = 0; i < group.teamIds.length; i++) {
      for (let j = i + 1; j < group.teamIds.length; j++) {
        const key = `${group.teamIds[i]}-${group.teamIds[j]}`;
        if (!existingPairings.has(key)) {
          pairings.push({
            homeTeamId: group.teamIds[i],
            awayTeamId: group.teamIds[j],
            group: group.name,
          });
        }
      }
    }
  }

  const usedSlots = new Map<string, Set<string>>();

  for (const pairing of pairings) {
    let bestDate = "";
    let bestScore = -1;
    let bestHomeAvail = 0;
    let bestAwayAvail = 0;
    let bestHomeTot = 0;
    let bestAwayTot = 0;

    for (const date of allDates) {
      const homeUsed = usedSlots.get(date)?.has(pairing.homeTeamId);
      const awayUsed = usedSlots.get(date)?.has(pairing.awayTeamId);
      if (homeUsed || awayUsed) continue;

      const home = countAvailable(
        pairing.homeTeamId,
        tournamentId,
        date,
        availability,
        teams
      );
      const away = countAvailable(
        pairing.awayTeamId,
        tournamentId,
        date,
        availability,
        teams
      );

      const score = home.available + away.available;
      if (score > bestScore) {
        bestScore = score;
        bestDate = date;
        bestHomeAvail = home.available;
        bestAwayAvail = away.available;
        bestHomeTot = home.total;
        bestAwayTot = away.total;
      }
    }

    if (bestDate) {
      if (!usedSlots.has(bestDate)) usedSlots.set(bestDate, new Set());
      usedSlots.get(bestDate)!.add(pairing.homeTeamId);
      usedSlots.get(bestDate)!.add(pairing.awayTeamId);

      suggestions.push({
        id: `sug-${suggestions.length + 1}`,
        homeTeamId: pairing.homeTeamId,
        awayTeamId: pairing.awayTeamId,
        date: bestDate,
        time: "17:00",
        availableHomePlayers: bestHomeAvail,
        totalHomePlayers: bestHomeTot,
        availableAwayPlayers: bestAwayAvail,
        totalAwayPlayers: bestAwayTot,
        score: bestScore,
        group: pairing.group,
      });
    }
  }

  return suggestions.sort((a, b) => b.score - a.score);
}
