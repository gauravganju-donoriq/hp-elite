import { Match, Standing, Group, Team } from "./types";

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
